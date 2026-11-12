import type { ChatTransport, UIMessage, UIMessageChunk } from 'ai'

import { createToolLoopTransport } from '@/app/ai/transports/tool-loop'

import { createRenderStreamModel } from '../render-stream/model'

export const COMMAND =
  'rg --files /Users/designer/.agents/skills/design-system-extraction/references'

function displayLabel(chunk: UIMessageChunk): UIMessageChunk {
  // Alias only the provider's visible name; Core executes render and owns the unchanged call ID.
  if (
    (chunk.type === 'tool-input-start' || chunk.type === 'tool-input-available') &&
    chunk.toolCallId === 'preview-call'
  ) {
    return { ...chunk, toolName: COMMAND, dynamic: true }
  }
  return chunk
}

export function installBrowserToolTitle() {
  const store = window.openPencil?.getStore?.()
  const setTransport = window.openPencil?.setChatTransport
  if (!store || !setTransport) throw new Error('Editor/chat bridge unavailable')
  const { model, ...controls } = createRenderStreamModel({
    jsx: `<Frame name="History card" w={200} h={200}><Text>${COMMAND}</Text></Frame>`,
    pauseAfter: ['History card']
  })
  setTransport(() => {
    const transport = createToolLoopTransport({
      store,
      model,
      providerID: 'openrouter',
      effectiveModelID: 'streaming-jsx',
      maxOutputTokens: 4096,
      thinkingLevel: () => 'default'
    })
    return {
      reconnectToStream: (options) => transport.reconnectToStream(options),
      async sendMessages(options) {
        const stream = await transport.sendMessages(options)
        return stream.pipeThrough(
          new TransformStream<UIMessageChunk, UIMessageChunk>({
            transform: (chunk, controller) => controller.enqueue(displayLabel(chunk))
          })
        )
      }
    } satisfies ChatTransport<UIMessage>
  })
  return controls
}
