import * as v from 'valibot'

import { sandboxDocument } from '@/app/code/sandbox/document'
import frameScript from '@/app/code/sandbox/frame.ts?script'
import {
  SANDBOX_READY,
  SANDBOX_RUN,
  sandboxFrameMessageSchema,
  type SandboxRunRequest,
  type SandboxRunResult
} from '@/app/code/sandbox/schema'

type SandboxEvaluationResult =
  | Omit<Extract<SandboxRunResult, { ok: true }>, 'id'>
  | Omit<Extract<SandboxRunResult, { ok: false }>, 'id'>

/** Runs bounded data-producing code in an opaque-origin frame's fresh worker. */
export function evaluateSandbox(
  input: Omit<SandboxRunRequest, 'id'>,
  timeoutMs: number,
  readyTimeoutMs: number,
  signal?: AbortSignal
): Promise<SandboxEvaluationResult> {
  const iframe = document.createElement('iframe')
  iframe.hidden = true
  iframe.setAttribute('sandbox', 'allow-scripts')
  iframe.srcdoc = sandboxDocument(frameScript)
  document.body.append(iframe)

  return new Promise((resolve) => {
    const id = crypto.randomUUID()
    let settled = false
    let timer: ReturnType<typeof setTimeout>

    const finish = (result: SandboxEvaluationResult) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      window.removeEventListener('message', onMessage)
      signal?.removeEventListener('abort', onAbort)
      iframe.remove()
      // eslint-disable-next-line promise/no-multiple-resolved -- settled guard makes completion single-shot
      resolve(result)
    }
    const onAbort = () => finish({ ok: false, error: 'Execution cancelled.' })
    const onMessage = (event: MessageEvent<unknown>) => {
      if (event.source !== iframe.contentWindow || event.origin !== 'null') return
      const parsed = v.safeParse(sandboxFrameMessageSchema, event.data)
      if (!parsed.success) return
      const message = parsed.output
      if (message.type === SANDBOX_READY) {
        clearTimeout(timer)
        // eslint-disable-next-line promise/no-multiple-resolved -- finish has a settled guard
        timer = setTimeout(
          () => finish({ ok: false, error: 'Design JSX execution timed out.' }),
          timeoutMs
        )
        const request: SandboxRunRequest = { id, ...input }
        iframe.contentWindow?.postMessage({ type: SANDBOX_RUN, ...request }, '*')
        return
      }
      if (message.id !== id) return
      if (!message.ok) {
        finish({
          ok: false,
          error: message.error,
          errorName: message.errorName,
          stack: message.stack,
          line: message.line,
          column: message.column
        })
        return
      }
      finish(message)
    }
    timer = setTimeout(
      () => finish({ ok: false, error: 'Design JSX sandbox did not become ready.' }),
      readyTimeoutMs
    )
    window.addEventListener('message', onMessage)
    signal?.addEventListener('abort', onAbort, { once: true })
    if (signal?.aborted) onAbort()
  })
}
