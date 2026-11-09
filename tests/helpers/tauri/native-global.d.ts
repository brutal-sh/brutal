/// <reference types="@wdio/globals/types" />

import type * as TauriAPI from '@tauri-apps/api'
import type * as TauriOS from '@tauri-apps/plugin-os'

export {}

declare global {
  interface Window {
    __TAURI__?: Pick<typeof TauriAPI, 'core' | 'event'> & { os?: typeof TauriOS }
  }
}
