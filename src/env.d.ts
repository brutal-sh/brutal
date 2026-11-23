/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/vanillajs" />
/// <reference types="unplugin-icons/types/vue" />

interface ImportMetaEnv {
  /** `on` only in official release builds; without it the app sends no pings or usage stats. */
  readonly VITE_OPENPENCIL_FEEDBACK?: string
  /** Explicitly enabled in Brutal beta builds after its receiver and disclosure are ready. */
  readonly VITE_BRUTAL_USAGE_STATS_ORIGIN?: string
}

declare const __OPENPENCIL_APP_VERSION__: string
/** The shipped desktop beta version, independent of bundled companion package versions. */
declare const __BRUTAL_MACOS_BETA_VERSION__: string | null
/** Whether the desktop build config names an update endpoint; forks default to no update checks. */
declare const __OPENPENCIL_UPDATES_ENABLED__: boolean
/** Whether this is the editor a Cloud server serves on its own address (`bun run build:cloud`). */
declare const __OPENPENCIL_CLOUD_SITE__: boolean
/** `VITE_OPENPENCIL_OFFICIAL_CLOUD_URL`: the official Cloud server an official deployment's build names. */
declare const __OPENPENCIL_OFFICIAL_CLOUD_URL__: string | null
declare const __OPENPENCIL_LOCAL_AUTOMATION_TOKEN__: string | null
declare const __OPENPENCIL_LOCAL_AUTOMATION_URL__: string
declare const __OPENPENCIL_LOCAL_AUTOMATION_HTTP_URL__: string

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

/** A module bundled with its imports into one classic script, as a string (`vite/inline-script.ts`). */
declare module '*?script' {
  const source: string
  export default source
}
