import { fontFallbackEntry, type FontFallbackScript } from '#core/text/fallbacks'
type FallbackSources = {
  loadLocal: (family: string) => Promise<ArrayBuffer | null>
  loadRemote: (
    family: string,
    characters: string,
    signal?: AbortSignal
  ) => Promise<ArrayBuffer | null>
  register: (family: string, data: ArrayBuffer) => ArrayBuffer | null
}
export class FontFallbacks {
  constructor(private readonly sources: FallbackSources) {}

  private fallbackUserAgent: string | undefined
  private cjkFallbackFamilies: string[] = []
  private cjkFallbackPromise: Promise<string[]> | null = null
  private arabicFallbackFamilies: string[] = []
  private arabicFallbackPromise: Promise<string[]> | null = null

  setFallbackUserAgent(userAgent: string | undefined): void {
    this.fallbackUserAgent = userAgent
  }

  async ensureCJKFallback(): Promise<string[]> {
    if (this.cjkFallbackFamilies.length > 0) return this.cjkFallbackFamilies
    if (this.cjkFallbackPromise) return this.cjkFallbackPromise

    this.cjkFallbackPromise = this.ensureFallbackFamilies('cjk', this.cjkFallbackFamilies)
    return this.cjkFallbackPromise
  }

  getCJKFallbackFamilies(): string[] {
    return this.cjkFallbackFamilies
  }

  setCJKFallbackFamily(family: string): void {
    if (!this.cjkFallbackFamilies.includes(family)) {
      this.cjkFallbackFamilies.push(family)
    }
  }

  async ensureArabicFallback(): Promise<string[]> {
    if (this.arabicFallbackFamilies.length > 0) return this.arabicFallbackFamilies
    if (this.arabicFallbackPromise) return this.arabicFallbackPromise

    this.arabicFallbackPromise = this.ensureFallbackFamilies('arabic', this.arabicFallbackFamilies)
    return this.arabicFallbackPromise
  }

  async ensureFallbackPack(
    scripts: FontFallbackScript[] = ['cjk', 'arabic'],
    characters = '',
    signal?: AbortSignal
  ): Promise<Partial<Record<FontFallbackScript, string[]>>> {
    signal?.throwIfAborted()
    const result: Partial<Record<FontFallbackScript, string[]>> = {}
    await Promise.all(
      scripts.map(async (script) => {
        signal?.throwIfAborted()
        const target = script === 'arabic' ? this.arabicFallbackFamilies : this.cjkFallbackFamilies
        if (signal) {
          result[script] = await this.ensureFallbackFamilies(script, target, characters, signal)
        } else if (script === 'arabic' && !characters) {
          result[script] = await this.ensureArabicFallback()
        } else if (script === 'cjk' && !characters) {
          result[script] = await this.ensureCJKFallback()
        } else {
          result[script] = await this.ensureFallbackFamilies(script, target, characters)
        }
      })
    )
    signal?.throwIfAborted()
    return result
  }

  getArabicFallbackFamilies(): string[] {
    return this.arabicFallbackFamilies
  }

  setArabicFallbackFamily(family: string): void {
    if (!this.arabicFallbackFamilies.includes(family)) {
      this.arabicFallbackFamilies.push(family)
    }
  }

  private async ensureFallbackFamilies(
    script: FontFallbackScript,
    targetFamilies: string[],
    characters = '',
    signal?: AbortSignal
  ): Promise<string[]> {
    signal?.throwIfAborted()
    const manifest = fontFallbackEntry(script, this.fallbackUserAgent)

    for (const family of manifest.localFamilies) {
      signal?.throwIfAborted()
      const buffer = await this.sources.loadLocal(family)
      signal?.throwIfAborted()
      if (buffer && this.sources.register(family, buffer) && !targetFamilies.includes(family)) {
        targetFamilies.push(family)
      }
    }

    if (targetFamilies.length === 0 || characters) {
      const results = await Promise.allSettled(
        manifest.remoteFamilies.map(async (family) => {
          signal?.throwIfAborted()
          const data = await this.sources.loadRemote(family, characters, signal)
          signal?.throwIfAborted()
          return data ? family : null
        })
      )
      for (const result of results) {
        if (
          result.status === 'fulfilled' &&
          result.value &&
          !targetFamilies.includes(result.value)
        ) {
          targetFamilies.push(result.value)
        }
      }
    }

    return targetFamilies
  }
}
