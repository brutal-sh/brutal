import { IS_BROWSER } from '#core/constants'

import { SharedReads } from './reads'
import { UnsupportedFontFormatError } from './sources'
import type {
  BundledFontLocator,
  DownloadedFontCache,
  HostFontLoader,
  FontUnavailableReason
} from './sources'

const defaultBundledFontLocator: BundledFontLocator = (file) => `/${file}`
export class FontLoading {
  private unavailableFaces = new Map<string, FontUnavailableReason>()
  private bundledFontLocator: BundledFontLocator = defaultBundledFontLocator
  private readonly bundledFontRequests = new Map<string, Promise<ArrayBuffer | null>>()
  private downloadedFontCache: DownloadedFontCache | null = null
  private hostFontLoader: HostFontLoader | null = null
  private readonly hostFontRequests = new SharedReads()

  setDownloadedFontCache(cache: DownloadedFontCache | null): void {
    this.downloadedFontCache = cache
  }

  setHostFontLoader(loader: HostFontLoader | null): void {
    this.hostFontLoader = loader
    this.hostFontRequests.clear()
  }

  /** Lets a host that bundles `@open-pencil/core/assets` itself say where each file ended up. */
  setBundledFontLocator(locate: BundledFontLocator | null): void {
    this.bundledFontLocator = locate ?? defaultBundledFontLocator
  }

  /**
   * Reads a bundled font. Concurrent loads of one face share a request, so they get the same
   * buffer; it is forgotten once settled, so a failed request can be retried.
   */
  fetchBundledFont(url: string): Promise<ArrayBuffer | null> {
    const pending = this.bundledFontRequests.get(url)
    if (pending) return pending
    const request = this.readBundledFont(url).finally(() => this.bundledFontRequests.delete(url))
    this.bundledFontRequests.set(url, request)
    return request
  }

  private async readBundledFont(url: string): Promise<ArrayBuffer | null> {
    if (IS_BROWSER) {
      const response = await fetch(this.bundledFontLocator(url.replace(/^\//, '')))
      // A missing file answers with an error page, which must not be read as a font.
      return response.ok ? response.arrayBuffer() : null
    }
    const { readFile } = await import(/* @vite-ignore */ 'node:fs/promises')
    const packageJSONURL = import.meta.resolve('@open-pencil/core/package.json')
    const buf = await readFile(new URL(`assets${url}`, packageJSONURL))
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
  }

  loadHostFont(family: string, style: string): Promise<ArrayBuffer | null> {
    const loader = this.hostFontLoader
    if (!loader) return Promise.resolve(null)
    return this.hostFontRequests.read(`${family}|${style}`, () =>
      this.readHostFont(loader, family, style)
    )
  }

  private async readHostFont(
    loader: HostFontLoader,
    family: string,
    style: string
  ): Promise<ArrayBuffer | null> {
    const key = `${family}|${style}`
    try {
      const data = await loader(family, style)
      // A read that started under a loader the host has replaced must not register its bytes.
      if (this.hostFontLoader !== loader) return null
      if (data) this.unavailableFaces.delete(key)
      return data
    } catch (e) {
      // A failure from a replaced loader says nothing about the face the new loader serves.
      if (this.hostFontLoader !== loader) return null
      if (e instanceof UnsupportedFontFormatError) {
        this.unavailableFaces.set(key, e.reason)
        return null
      }
      console.warn(`Host fallback font load failed for "${family}" ${style}:`, e)
      return null
    }
  }

  async readDownloadedFont(
    family: string,
    style: string,
    characters = ''
  ): Promise<ArrayBuffer | null> {
    if (!this.downloadedFontCache) return null
    try {
      return await this.downloadedFontCache.read(family, style, characters)
    } catch (e) {
      console.warn(`Downloaded font cache read failed for "${family}" ${style}:`, e)
      return null
    }
  }

  async writeDownloadedFont(
    family: string,
    style: string,
    data: ArrayBuffer,
    characters = ''
  ): Promise<void> {
    if (!this.downloadedFontCache) return
    try {
      await this.downloadedFontCache.write(family, style, data, characters)
    } catch (e) {
      console.warn(`Downloaded font cache write failed for "${family}" ${style}:`, e)
    }
  }

  /** Why the host could not load an installed face, when it reported a reason. */
  unavailableReason(family: string, style: string): FontUnavailableReason | null {
    return this.unavailableFaces.get(`${family}|${style}`) ?? null
  }
}
