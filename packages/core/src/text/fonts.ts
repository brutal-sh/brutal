import type { CanvasKit, TypefaceFontProvider } from 'canvaskit-wasm'

import type { FontVariation, SceneGraph } from '@open-pencil/scene-graph'

import { IS_BROWSER } from '#core/constants'
import { fontFaceRenderFamily } from '#core/text/face'
import { BUNDLED_FONTS, FontCatalog } from '#core/text/font/catalog'
import type { FamilyFace } from '#core/text/font/faces'
import { FontFallbacks } from '#core/text/font/fallback'
import { FontLoading } from '#core/text/font/loading'
import { FontMetadata } from '#core/text/font/metadata'
import { FontProviders } from '#core/text/font/providers'
import { sameFontFile } from '#core/text/font/reads'
import { fontAxes, type FontAxis, type NamedInstance } from '#core/text/font/variation'

export * from '#core/text/font/sources'
export * from '#core/text/font/style'
export * from '#core/text/font/variation'
export * from '#core/text/font/woff2'
import {
  normalizeFontFamily,
  parseFontStyle,
  styleToWeight,
  weightToStyle
} from '@open-pencil/scene-graph/font-style'

import type { FontFallbackScript } from '#core/text/fallbacks'
import { loadHarfBuzz } from '#core/text/font/harfbuzz'
import type {
  BundledFontLocator,
  DownloadedFontCache,
  FontFamilyOption,
  FontInfo,
  FontLoadedSource,
  FontUnavailableReason,
  HostFontLoader,
  LocalFontAccessState
} from '#core/text/font/sources'
import { collectGraphFontKeys } from '#core/text/requirements'
import { normalizedCoverageText, WebFontResolver } from '#core/text/web-fonts'
import type { WebFontFetch, WebFontProviderId } from '#core/text/web-fonts'

/** `load`'s answer once HarfBuzz has loaded too, the two loading side by side. */
async function withHarfBuzz<T>(load: Promise<T>): Promise<T> {
  const [answer] = await Promise.all([load, loadHarfBuzz()])
  return answer
}

export class FontManager {
  private loadedFamilies = new Map<string, ArrayBuffer>()
  private loadedFamilySources = new Map<string, FontLoadedSource>()
  private supplementalFamilyData = new Map<string, ArrayBuffer[]>()
  /** The name each file of a family loaded from several files is registered under. */
  private fileFamilies = new Map<ArrayBuffer, string>()
  /**
   * Families a style's file was replaced in, such as a web font fetched again for more characters.
   * The old file stays registered first under the family's name, and CanvasKit draws with the
   * first file it has for a style, so these draw from each file's own name.
   */
  private replacedFamilies = new Set<string>()
  private remoteCoverage = new Map<string, Set<string>>()
  private blockedNodeIds = new Set<string>()
  private webFonts = new WebFontResolver()
  private readonly providers = new FontProviders()
  private readonly metadata = new FontMetadata()
  private readonly loading = new FontLoading()
  private readonly catalog = new FontCatalog(this.webFonts, () =>
    IS_BROWSER ? window.queryLocalFonts?.bind(window) : undefined
  )
  private readonly fallbacks = new FontFallbacks({
    loadLocal: async (family) =>
      (await this.loading.loadHostFont(family, 'Regular')) ??
      (await this.catalog.findLocalFont(family)),
    loadRemote: (family, characters, signal) =>
      this.loadRemoteFont(family, 'Regular', characters, signal),
    register: (family, data) => this.registerAndCache(family, 'Regular', data, 'fallback')
  })

  attachProvider(canvasKit: CanvasKit, provider: TypefaceFontProvider): void {
    this.providers.attachProvider(canvasKit, provider)
    for (const [cacheKey, data] of this.loadedFamilies) {
      const separator = cacheKey.indexOf('|')
      const family = cacheKey.slice(0, separator)
      this.providers.registerFontInProvider(provider, family, data)
      for (const supplemental of this.supplementalFamilyData.get(cacheKey) ?? []) {
        this.providers.registerFontInProvider(provider, family, supplemental)
      }
    }
  }

  detachProvider(provider: TypefaceFontProvider): void {
    return this.providers.detachProvider(provider)
  }

  provider(): TypefaceFontProvider | null {
    return this.providers.provider()
  }

  /** The latest attached provider made by `canvasKit`; another build's provider cannot shape with it. */
  providerFor(canvasKit: CanvasKit): TypefaceFontProvider | null {
    return this.providers.providerFor(canvasKit)
  }

  generation(): number {
    return this.providers.generation()
  }

  blockNodesUntilFontsResolve(nodeIds: readonly string[]): void {
    for (const nodeId of nodeIds) this.blockedNodeIds.add(nodeId)
  }

  unblockNodes(nodeIds: readonly string[]): void {
    for (const nodeId of nodeIds) this.blockedNodeIds.delete(nodeId)
  }

  isNodeBlocked(nodeId: string): boolean {
    return this.blockedNodeIds.has(nodeId)
  }

  localAccessState(): LocalFontAccessState {
    return this.catalog.localAccessState()
  }

  setDownloadedFontCache(cache: DownloadedFontCache | null): void {
    return this.loading.setDownloadedFontCache(cache)
  }

  setFallbackUserAgent(userAgent: string | undefined): void {
    return this.fallbacks.setFallbackUserAgent(userAgent)
  }

  setHostFontLoader(loader: HostFontLoader | null): void {
    return this.loading.setHostFontLoader(loader)
  }

  /** Lets a host that bundles `@open-pencil/core/assets` itself say where each file ended up. */
  setBundledFontLocator(locate: BundledFontLocator | null): void {
    return this.loading.setBundledFontLocator(locate)
  }

  setOnlineFontProviders(settings: Partial<Record<WebFontProviderId, boolean>>): void {
    this.webFonts.setEnabled(settings)
    this.catalog.forgetFamilyFaces()
  }

  /** The system fonts a desktop host lists, by family, with the style names of their faces. */
  setHostFontCatalog(fonts: readonly { family: string; styles: readonly string[] }[]): void {
    return this.catalog.setHostFontCatalog(fonts)
  }

  /**
   * The faces a family has: its installed fonts', else a web provider's, else the bundled ones;
   * `null` when nothing says, so a caller offers every weight.
   */
  familyFaces(family: string): Promise<FamilyFace[] | null> {
    return this.catalog.familyFaces(family)
  }

  /** The faces `familyFaces` found for a family, once it has; `undefined` before. */
  loadedFamilyFaces(family: string): FamilyFace[] | null | undefined {
    return this.catalog.loadedFamilyFaces(family)
  }

  /** Whether a family has this face, or nothing found so far says it has not. */
  offersFace(family: string, weight: number, italic: boolean): boolean {
    return this.catalog.offersFace(family, weight, italic)
  }

  /**
   * Calls the listener whenever the faces found so far are forgotten, as when the host's font
   * catalog arrives or online providers change, so a caller asks for its families again.
   */
  onFamilyFacesReset(listener: () => void): () => void {
    return this.catalog.onFamilyFacesReset(listener)
  }

  setWebFontFetch(fetcher: WebFontFetch | null): void {
    this.webFonts.setRemoteFetch(fetcher)
  }

  resetWebFontFailures(family?: string, style?: string): void {
    this.webFonts.resetFailures(family, style)
  }

  enabledOnlineFontProviders(): WebFontProviderId[] {
    return this.webFonts.enabledProviders()
  }

  loadCachedFont(family: string, style = 'Regular', characters = ''): Promise<ArrayBuffer | null> {
    return withHarfBuzz(this.restoreCachedFont(family, style, characters))
  }

  private async restoreCachedFont(
    family: string,
    style = 'Regular',
    characters = ''
  ): Promise<ArrayBuffer | null> {
    const cached = await this.loading.readDownloadedFont(family, style, characters)
    if (!cached) return null
    const key = `${family}|${style}`
    const loadedCoverage = this.remoteCoverage.get(key) ?? new Set<string>()
    for (const character of normalizedCoverageText(characters)) loadedCoverage.add(character)
    this.remoteCoverage.set(key, loadedCoverage)
    return this.registerAndCache(family, style, cached, 'cache')
  }

  async requestLocalFontAccess(): Promise<FontInfo[]> {
    return this.catalog.requestLocalFontAccess()
  }

  async listFamilies(): Promise<string[]> {
    const options = await this.listFamilyOptions()
    return options.map((option) => option.family)
  }

  async listFamilyOptions(): Promise<FontFamilyOption[]> {
    return this.catalog.listFamilyOptions()
  }

  preloadWebFontFamilies(): void {
    this.webFonts.preloadFamilies()
  }

  /**
   * Reads a bundled font. Concurrent loads of one face share a request, so they get the same
   * buffer; it is forgotten once settled, so a failed request can be retried.
   */
  fetchBundledFont(url: string): Promise<ArrayBuffer | null> {
    return this.loading.fetchBundledFont(url)
  }

  loadLocalFont(family: string, style = 'Regular'): Promise<ArrayBuffer | null> {
    return withHarfBuzz(this.findLocalOrBundledFont(family, style))
  }

  private async findLocalOrBundledFont(
    family: string,
    style = 'Regular'
  ): Promise<ArrayBuffer | null> {
    const loaded = this.loadedFamilies.get(`${family}|${style}`)
    if (loaded) {
      this.providers.registerFontInCanvasKit(family, loaded)
      return loaded
    }
    return (
      (await this.loadInstalledFont(family, style)) ?? (await this.loadBundledFont(family, style))
    )
  }

  /** The face installed on this machine, from the host or the browser's local fonts. */
  private async loadInstalledFont(family: string, style: string): Promise<ArrayBuffer | null> {
    const hostBuffer = await this.loading.loadHostFont(family, style)
    if (hostBuffer) return this.registerAndCache(family, style, hostBuffer, 'local')
    const localBuffer = await this.catalog.findLocalFont(family, style)
    return localBuffer ? this.registerAndCache(family, style, localBuffer, 'local') : null
  }

  private async loadBundledFont(family: string, style: string): Promise<ArrayBuffer | null> {
    const bundledURL = BUNDLED_FONTS[`${family}|${style}`]
    if (!bundledURL) return null
    try {
      const buffer = await this.fetchBundledFont(bundledURL)
      return buffer ? this.registerAndCache(family, style, buffer, 'bundled') : null
    } catch (e) {
      console.warn(`Bundled font load failed for "${family}" ${style}:`, e)
      return null
    }
  }

  loadRemoteFont(
    family: string,
    style = 'Regular',
    characters = '',
    signal?: AbortSignal
  ): Promise<ArrayBuffer | null> {
    return withHarfBuzz(this.downloadFont(family, style, characters, signal))
  }

  private async downloadFont(
    family: string,
    style = 'Regular',
    characters = '',
    signal?: AbortSignal
  ): Promise<ArrayBuffer | null> {
    signal?.throwIfAborted()
    if (typeof fetch === 'undefined') return null
    const coverage = this.remoteCoverage.get(`${family}|${style}`)
    if (
      characters &&
      coverage &&
      Array.from(characters).every((character) => coverage.has(character))
    ) {
      return this.loadedData(family, style)
    }
    try {
      const requestedCharacters = normalizedCoverageText(
        `${coverage ? Array.from(coverage).join('') : ''}${characters}`
      )
      const normalized = normalizeFontFamily(family)
      const families = normalized === family ? [family] : [family, normalized]
      const resolved = await this.webFonts.fetchFont(families, style, requestedCharacters, signal)
      if (!resolved || resolved.buffers.length === 0) return null
      const primary = resolved.buffers[0]
      await this.loading.writeDownloadedFont(family, style, primary, requestedCharacters)
      const registered = this.registerAndCache(family, style, primary, resolved.provider)
      const loadedCoverage = this.remoteCoverage.get(`${family}|${style}`) ?? new Set<string>()
      for (const character of requestedCharacters) loadedCoverage.add(character)
      this.remoteCoverage.set(`${family}|${style}`, loadedCoverage)
      for (const supplemental of resolved.buffers.slice(1)) {
        this.registerSupplemental(family, style, supplemental)
      }
      return registered
    } catch (e) {
      if (signal?.aborted) throw e
      console.warn(`Web font fetch failed for "${family}" ${style}:`, e)
      return null
    }
  }

  loadFont(
    family: string,
    style = 'Regular',
    characters = '',
    signal?: AbortSignal
  ): Promise<ArrayBuffer | null> {
    return withHarfBuzz(this.findFont(family, style, characters, signal))
  }

  private async findFont(
    family: string,
    style = 'Regular',
    characters = '',
    signal?: AbortSignal
  ): Promise<ArrayBuffer | null> {
    signal?.throwIfAborted()
    const loaded = this.loadedData(family, style)
    if (loaded) {
      this.providers.registerFontInCanvasKit(family, loaded)
      return this.withRemoteCoverage(family, style, loaded, characters, signal)
    }
    // An installed face of the style comes first; otherwise a variable file the family already
    // loaded draws it.
    const installed = await this.loadInstalledFont(family, style)
    if (installed) return installed
    const shared = this.sharedVariableFace(family, style)
    if (shared) return this.withRemoteCoverage(family, style, shared, characters, signal)

    return (
      (await this.loadBundledFont(family, style)) ??
      (await this.loadCachedFont(family, style, characters)) ??
      (await this.loadRemoteFont(family, style, characters, signal))
    )
  }

  /**
   * `data`, or a web font fetched again with `characters` when it came from the web without them,
   * as a provider cuts a font down to the text it is asked for.
   */
  private async withRemoteCoverage(
    family: string,
    style: string,
    data: ArrayBuffer,
    characters: string,
    signal?: AbortSignal
  ): Promise<ArrayBuffer> {
    const remoteCoverage = this.remoteCoverage.get(`${family}|${style}`)
    const missingRemoteCoverage = Boolean(
      characters &&
      remoteCoverage &&
      Array.from(characters).some((character) => !remoteCoverage.has(character))
    )
    return missingRemoteCoverage
      ? ((await this.loadRemoteFont(family, style, characters, signal)) ?? data)
      : data
  }

  /**
   * A variable font the family loaded for another style in the same slant whose weight axis
   * reaches this style's weight, registered for this style too: one file draws every weight.
   */
  private sharedVariableFace(family: string, style: string): ArrayBuffer | null {
    const { weight, italic } = parseFontStyle(style)
    for (const [key, data] of this.loadedFamilies) {
      if (!key.startsWith(`${family}|`)) continue
      if (parseFontStyle(key.slice(family.length + 1)).italic !== italic) continue
      const wght = fontAxes(data)?.find((axis) => axis.tag === 'wght')
      if (!wght || weight < wght.min || weight > wght.max) continue
      const coverage = this.remoteCoverage.get(key)
      if (coverage) this.remoteCoverage.set(`${family}|${style}`, new Set(coverage))
      return this.registerAndCache(family, style, data, this.loadedFamilySources.get(key))
    }
    return null
  }

  async ensureNodeFont(family: string, weight: number): Promise<void> {
    await this.loadFont(family, weightToStyle(weight))
  }

  /** Registers a font the caller already has, resolving once its outlines can be read. */
  async markLoaded(
    family: string,
    style: string,
    data: ArrayBuffer,
    source: FontLoadedSource = 'registered'
  ): Promise<void> {
    this.registerAndCache(family, style, data, source)
    await loadHarfBuzz()
  }

  loadedFontSource(family: string, style: string): FontLoadedSource | null {
    return this.loadedFamilySources.get(`${family}|${style}`) ?? null
  }

  /** Why the host could not load an installed face, when it reported a reason. */
  unavailableReason(family: string, style: string): FontUnavailableReason | null {
    return this.loading.unavailableReason(family, style)
  }

  isLoaded(family: string): boolean {
    return [...this.loadedFamilies.keys()].some((k) => k.startsWith(`${family}|`))
  }

  isStyleLoaded(family: string, style: string): boolean {
    return this.loadedFamilies.has(`${family}|${style}`)
  }

  remoteStyleNeedsCoverage(family: string, style: string, characters: readonly string[]): boolean {
    const coverage = this.remoteCoverage.get(`${family}|${style}`)
    return !!coverage && characters.some((character) => !coverage.has(character))
  }

  loadedData(family: string, style: string): ArrayBuffer | null {
    return this.loadedFamilies.get(`${family}|${style}`) ?? null
  }

  bundledData(family: string, style: string): ArrayBuffer | null {
    const key = `${family}|${style}`
    return this.loadedFamilySources.get(key) === 'bundled' ? this.loadedData(family, style) : null
  }

  /**
   * The variation axes and named instances of a family's variable font, from a face it has loaded,
   * in the slant asked for where it has one: `null` when the faces it has loaded are static,
   * `undefined` when it has loaded none.
   */
  familyVariation(
    family: string,
    italic?: boolean
  ): { data: ArrayBuffer; axes: FontAxis[]; instances: NamedInstance[] } | null | undefined {
    return this.metadata.forFamily(family, this.loadedFamilies, italic)
  }

  /** Axis coordinates for `style` when the loaded face is a variable font, otherwise `null`. */
  namedInstanceVariations(family: string, style: string): FontVariation[] | null {
    const data = this.loadedData(family, style)
    return data ? this.metadata.namedInstanceVariations(data, style) : null
  }

  /**
   * The family CanvasKit is asked for to draw `style` of `family`. A family loaded from one file
   * draws under its own name, with every coverage shard, as some CJK and Arabic faces need to
   * paint. Loaded from several files, such as a bundled static face beside a downloaded variable
   * one, CanvasKit would pick among them by the weight each file declares, which can tie; each
   * style then draws from the file loaded for it, registered with its shards under a name of the
   * file's own. So does a family a style's file was replaced in, whose old file CanvasKit would
   * keep drawing under the family's name.
   */
  renderFamily(family: string, style: string): string {
    const data = this.loadedData(family, style)
    if (!data || (this.familyFileCount(family) < 2 && !this.replacedFamilies.has(family)))
      return family
    const name = this.fileFamily(family, data)
    for (const shard of this.supplementalFamilyData.get(`${family}|${style}`) ?? [])
      this.providers.registerFontInCanvasKit(name, shard)
    return name
  }

  /**
   * The names CanvasKit draws the other files of `style` of `family` under, such as the coverage
   * shards of a web font split by unicode-range. CanvasKit draws a character only from the first
   * file registered under a name, so each shard is a family of its own that text falls back to.
   */
  renderShardFamilies(family: string, style: string): string[] {
    return (this.supplementalFamilyData.get(`${family}|${style}`) ?? []).map((data) =>
      this.fileFamily(family, data)
    )
  }

  /** The files of `style` of `family` after its own, such as the shards of a split web font. */
  shardData(family: string, style: string): readonly ArrayBuffer[] {
    return this.supplementalFamilyData.get(`${family}|${style}`) ?? []
  }

  /** The name one file of `family` is registered under on its own. */
  private fileFamily(family: string, data: ArrayBuffer): string {
    let name = this.fileFamilies.get(data)
    if (!name) {
      name = fontFaceRenderFamily(family, `file ${this.fileFamilies.size + 1}`)
      this.fileFamilies.set(data, name)
    }
    this.providers.registerFontInCanvasKit(name, data)
    return name
  }

  /** How many files the family's loaded styles come from. */
  private familyFileCount(family: string): number {
    const files = new Set<ArrayBuffer>()
    for (const [key, data] of this.loadedFamilies) if (key.startsWith(`${family}|`)) files.add(data)
    return files.size
  }

  collectFontKeys(graph: SceneGraph, nodeIds: string[]): Array<[string, string]> {
    return collectGraphFontKeys(graph, nodeIds)
  }

  async ensureCJKFallback(): Promise<string[]> {
    return this.fallbacks.ensureCJKFallback()
  }

  getCJKFallbackFamilies(): string[] {
    return this.fallbacks.getCJKFallbackFamilies()
  }

  setCJKFallbackFamily(family: string): void {
    return this.fallbacks.setCJKFallbackFamily(family)
  }

  async ensureArabicFallback(): Promise<string[]> {
    return this.fallbacks.ensureArabicFallback()
  }

  ensureFallbackPack(
    scripts: FontFallbackScript[] = ['cjk', 'arabic'],
    characters = '',
    signal?: AbortSignal
  ): Promise<Partial<Record<FontFallbackScript, string[]>>> {
    return withHarfBuzz(this.fallbacks.ensureFallbackPack(scripts, characters, signal))
  }

  getArabicFallbackFamilies(): string[] {
    return this.fallbacks.getArabicFallbackFamilies()
  }

  setArabicFallbackFamily(family: string): void {
    return this.fallbacks.setArabicFallbackFamily(family)
  }

  private registerSupplemental(family: string, style: string, buffer: ArrayBuffer): void {
    const key = `${family}|${style}`
    const supplemental = this.supplementalFamilyData.get(key) ?? []
    if (supplemental.some((file) => sameFontFile(file, buffer))) return
    supplemental.push(buffer)
    this.supplementalFamilyData.set(key, supplemental)
    this.providers.registerFontInCanvasKit(family, buffer)
    this.registerFontInBrowser(family, style, buffer)
  }

  private registerAndCache(
    family: string,
    style: string,
    buffer: ArrayBuffer,
    source?: FontLoadedSource
  ): ArrayBuffer | null {
    const key = `${family}|${style}`
    const existing = this.loadedFamilies.get(key)
    if (existing && sameFontFile(existing, buffer)) {
      if (source) this.loadedFamilySources.set(key, source)
      this.providers.registerFontInCanvasKit(family, existing)
      return existing
    }
    if (existing) {
      this.registerSupplemental(family, style, existing)
      this.replacedFamilies.add(family)
    }
    this.loadedFamilies.set(key, buffer)
    if (source) this.loadedFamilySources.set(key, source)
    this.providers.registerFontInCanvasKit(family, buffer)
    this.registerFontInBrowser(family, style, buffer)
    return buffer
  }

  /** Makes a face available to the page's own text, such as fields over canvas labels. */
  registerFontInBrowser(family: string, style: string, data: ArrayBuffer) {
    if (!IS_BROWSER) return
    const weight = styleToWeight(style)
    const italic = style.toLowerCase().includes('italic') ? 'italic' : 'normal'
    const face = new FontFace(family, data, {
      weight: String(weight),
      style: italic
    })
    face
      .load()
      .then(() => document.fonts.add(face))
      .catch(() => {
        console.warn(`Failed to load font "${family}" (${style})`)
      })
  }
}

export const fontManager = new FontManager()
