import type { InjectionKey } from 'vue'

export const toggleBrowserPreviewKey: InjectionKey<() => void> = Symbol('toggle-browser-preview')
export const openBrowserExportKey: InjectionKey<(path: string) => Promise<void>> =
  Symbol('open-browser-export')

export interface BrowserPreviewSession {
  url: string
  preset: string
  zoom: number
  /** This workspace's clip height in editor CSS pixels; never a browsing preference. */
  clipHeight?: number | null
  closing: Promise<void>
  exportURLs: Set<string>
}
