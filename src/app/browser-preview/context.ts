import type { InjectionKey } from 'vue'

export const toggleBrowserPreviewKey: InjectionKey<() => void> = Symbol('toggle-browser-preview')
