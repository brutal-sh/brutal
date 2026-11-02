import type { InjectionKey } from 'vue'

export const toggleBrowserPreviewKey: InjectionKey<() => void> = Symbol('toggle-browser-preview')

export interface BrowserPreviewSession {
  url: string
  preset: string
  closing: Promise<void>
}
