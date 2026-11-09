import { DEFAULT_FONT_FAMILY, IS_BROWSER } from '#core/constants'
import type { WebFontResolver } from '#core/text/web-fonts'

import { facesFromStyles, hasFamilyFace, type FamilyFace } from './faces'
import { SharedReads } from './reads'
import type { FontInfo, LocalFontAccessState, FontFamilyOption } from './sources'
import { chooseLocalFontMatch } from './style'

/** Inter's weights, each drawn from Inter's variable files at its named instance. */
const INTER_WEIGHTS = [
  'Thin',
  'ExtraLight',
  'Light',
  'Regular',
  'Medium',
  'SemiBold',
  'Bold',
  'ExtraBold',
  'Black'
]
export const BUNDLED_FONTS: Record<string, string> = {
  ...Object.fromEntries(
    INTER_WEIGHTS.map((weight) => [`Geist Mono|${weight}`, '/GeistMonoVariable.ttf'])
  ),
  ...Object.fromEntries(
    INTER_WEIGHTS.slice(0, -1).map((weight) => [
      `JetBrains Mono|${weight}`,
      '/JetBrainsMonoVariable.ttf'
    ])
  ),
  'Anton|Regular': '/Anton-Regular.ttf',
  ...Object.fromEntries(
    ['Regular', 'Medium', 'SemiBold', 'Bold'].map((weight) => [
      `Instrument Sans|${weight}`,
      '/InstrumentSansVariable.ttf'
    ])
  ),
  ...Object.fromEntries(INTER_WEIGHTS.map((weight) => [`Inter|${weight}`, '/InterVariable.ttf'])),
  ...Object.fromEntries(
    INTER_WEIGHTS.map((weight) => [`Inter|${weight} Italic`, '/InterVariable-Italic.ttf'])
  ),
  'Noto Naskh Arabic|Regular': '/NotoNaskhArabic-Regular.ttf',
  'OpenPencil Emoji Metrics|Regular': '/OpenPencilEmojiMetrics-Regular.ttf'
}
export class FontCatalog {
  constructor(
    private readonly webFonts: WebFontResolver,
    private readonly localFontQuery: () => Window['queryLocalFonts']
  ) {}

  private localFonts: FontInfo[] | null = null
  private readonly localFontRequests = new SharedReads()
  private hostStyles = new Map<string, readonly string[]>()
  private familyFaceLoads = new Map<string, Promise<FamilyFace[] | null>>()
  private knownFamilyFaces = new Map<string, FamilyFace[] | null>()
  private familyFacesListeners = new Set<() => void>()
  private localFontAccessState: LocalFontAccessState = IS_BROWSER ? 'prompt' : 'unsupported'

  localAccessState(): LocalFontAccessState {
    return this.localFontAccessState
  }

  /** The system fonts a desktop host lists, by family, with the style names of their faces. */
  setHostFontCatalog(fonts: readonly { family: string; styles: readonly string[] }[]): void {
    this.hostStyles = new Map(fonts.map((font) => [font.family, [...font.styles]]))
    this.forgetFamilyFaces()
  }

  /**
   * The faces a family has: its installed fonts', else a web provider's, else the bundled ones;
   * `null` when nothing says, so a caller offers every weight.
   */
  familyFaces(family: string): Promise<FamilyFace[] | null> {
    let load = this.familyFaceLoads.get(family)
    if (!load) {
      const pending = this.loadFamilyFaces(family).then((faces) => {
        // Faces forgotten while the lookup ran came from the sources it read before.
        if (this.familyFaceLoads.get(family) === pending) this.knownFamilyFaces.set(family, faces)
        return faces
      })
      load = pending
      this.familyFaceLoads.set(family, load)
    }
    return load
  }

  /** The faces `familyFaces` found for a family, once it has; `undefined` before. */
  loadedFamilyFaces(family: string): FamilyFace[] | null | undefined {
    return this.knownFamilyFaces.get(family)
  }

  /** Whether a family has this face, or nothing found so far says it has not. */
  offersFace(family: string, weight: number, italic: boolean): boolean {
    const faces = this.knownFamilyFaces.get(family)
    return !faces || hasFamilyFace(faces, weight, italic)
  }

  /**
   * Calls the listener whenever the faces found so far are forgotten, as when the host's font
   * catalog arrives or online providers change, so a caller asks for its families again.
   */
  onFamilyFacesReset(listener: () => void): () => void {
    this.familyFacesListeners.add(listener)
    return () => this.familyFacesListeners.delete(listener)
  }

  private async loadFamilyFaces(family: string): Promise<FamilyFace[] | null> {
    const installed =
      this.hostStyles.get(family) ??
      this.localFonts?.filter((font) => font.family === family).map((font) => font.style) ??
      []
    if (installed.length > 0) return facesFromStyles(installed)
    const web = await this.webFonts.familyFaces(family)
    if (web.length > 0) return web
    const bundled = Object.keys(BUNDLED_FONTS)
      .filter((key) => key.startsWith(`${family}|`))
      .map((key) => key.slice(family.length + 1))
    return bundled.length > 0 ? facesFromStyles(bundled) : null
  }

  forgetFamilyFaces(): void {
    this.familyFaceLoads.clear()
    this.knownFamilyFaces.clear()
    for (const listener of this.familyFacesListeners) listener()
  }

  async requestLocalFontAccess(): Promise<FontInfo[]> {
    const query = this.localFontQuery()
    if (!query) {
      this.localFontAccessState = 'unsupported'
      this.localFonts = []
      return []
    }
    try {
      const fonts = await query()
      const seen = new Set<string>()
      const result: FontInfo[] = []
      for (const f of fonts) {
        const key = `${f.family}|${f.style}`
        if (seen.has(key)) continue
        seen.add(key)
        result.push({
          family: f.family,
          fullName: f.fullName,
          style: f.style,
          postscriptName: f.postscriptName
        })
      }
      this.localFonts = result
      this.localFontAccessState = 'granted'
      this.forgetFamilyFaces()
      return result
    } catch {
      this.localFonts = []
      this.localFontAccessState = 'denied'
      return []
    }
  }

  async listFamilyOptions(): Promise<FontFamilyOption[]> {
    const fonts = this.localFonts ?? (await this.requestLocalFontAccess())
    const webFontFamilies = await Promise.all(
      this.webFonts.enabledProviders().map(async (provider) => ({
        provider,
        families: await this.webFonts.listFamilies(provider)
      }))
    )
    const byFamily = new Map<string, FontFamilyOption>()
    byFamily.set(DEFAULT_FONT_FAMILY, { family: DEFAULT_FONT_FAMILY, source: 'bundled' })
    for (const { provider, families } of webFontFamilies) {
      for (const family of families) {
        if (!byFamily.has(family)) byFamily.set(family, { family, source: provider })
      }
    }
    for (const font of fonts) byFamily.set(font.family, { family: font.family, source: 'local' })
    return [...byFamily.values()].sort((a, b) => a.family.localeCompare(b.family))
  }

  findLocalFont(family: string, style?: string): Promise<ArrayBuffer | null> {
    if (!this.localFontQuery()) return Promise.resolve(null)
    if (this.localFontAccessState !== 'granted') return Promise.resolve(null)
    // A query answers with a new blob, and so new bytes, every time; the face decides the match.
    return this.localFontRequests.read(`${family}|${style ?? ''}`, () =>
      this.readLocalFont(family, style)
    )
  }

  private async readLocalFont(family: string, style?: string): Promise<ArrayBuffer | null> {
    try {
      const fonts = await this.localFontQuery()?.()
      if (!fonts) return null
      const match = chooseLocalFontMatch(fonts, family, style)
      if (!match) return null
      const blob: Blob = await match.blob()
      return await blob.arrayBuffer()
    } catch (e) {
      console.warn(`Local font access failed for "${family}" ${style ?? ''}:`, e)
      return null
    }
  }
}
