import type { Command } from '@tauri-apps/plugin-shell'

interface OutputState {
  chunks: Uint8Array[]
  resolve: ((chunk: Uint8Array | null) => void) | null
  closed: boolean
  error: Error | null
}

interface OutputOptions {
  destroying: () => boolean
  onUnexpectedClose: () => void
}

/** Drain complete messages already received before reporting an unexpected process exit. */
export function acpOutput(
  command: Command<Uint8Array>,
  { destroying, onUnexpectedClose }: OutputOptions
): ReadableStream<Uint8Array> {
  const state: OutputState = { chunks: [], resolve: null, closed: false, error: null }
  command.stdout.on('data', (raw: Uint8Array | number[]) => {
    const chunk = raw instanceof Uint8Array ? raw : new Uint8Array(raw)
    if (state.resolve) {
      const resolve = state.resolve
      state.resolve = null
      resolve(chunk)
    } else state.chunks.push(chunk)
  })
  command.on('close', () => {
    state.closed = true
    state.error = destroying() ? null : new Error('Agent process exited unexpectedly.')
    if (state.resolve) {
      const resolve = state.resolve
      state.resolve = null
      resolve(null)
    }
    if (!destroying()) onUnexpectedClose()
  })
  return new ReadableStream<Uint8Array>({
    pull: (controller) => pullOutput(state, controller)
  })
}

async function pullOutput(
  state: OutputState,
  controller: ReadableStreamDefaultController<Uint8Array>
) {
  const buffered = state.chunks.shift()
  if (buffered) {
    controller.enqueue(buffered)
    return
  }
  if (state.closed) {
    if (state.error) controller.error(state.error)
    else controller.close()
    return
  }
  const chunk = await new Promise<Uint8Array | null>((resolve) => {
    state.resolve = resolve
  })
  if (chunk) controller.enqueue(chunk)
  else if (state.error) controller.error(state.error)
  else controller.close()
}
