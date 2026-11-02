/**
 * The sandbox worker's entry, which the frame starts from a `blob:` URL (`frame.ts`). Code it
 * runs reaches no network: the worker's own globals for it are replaced before the first run.
 */
import type { SandboxRunRequest } from '@/app/code/sandbox/schema'
import { runCanvasScript } from '@/app/document/scripts/run'
import { loadScriptVM } from '@/app/document/scripts/vm'

import { runDesignJSX } from './run'

const blocked = () => {
  throw new Error('Network access is unavailable in Design JSX.')
}
Object.defineProperties(self, {
  fetch: { value: blocked },
  XMLHttpRequest: { value: undefined },
  WebSocket: { value: undefined },
  EventSource: { value: undefined },
  importScripts: { value: blocked }
})

const report = self.postMessage.bind(self)

self.onmessage = async (event: MessageEvent<SandboxRunRequest>) => {
  try {
    report(
      event.data.canvasScript
        ? runCanvasScript(event.data, await loadScriptVM())
        : runDesignJSX(event.data)
    )
  } catch (error) {
    report({
      id: event.data.id,
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    })
  }
}
