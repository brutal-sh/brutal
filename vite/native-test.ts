import { basename } from 'node:path'

import type { Plugin } from 'vite'

/** Keep WDIO's frontend and ambient types outside the application entry and ordinary builds. */
export function nativeTestPlugin(): Plugin {
  return {
    name: 'open-pen-native-test',
    transformIndexHtml: {
      order: 'pre',
      handler(_html, context) {
        if (basename(context.filename) !== 'index.html') return
        return [
          {
            tag: 'script',
            attrs: { type: 'module' },
            children: "import '@wdio/tauri-plugin';",
            injectTo: 'head'
          }
        ]
      }
    }
  }
}
