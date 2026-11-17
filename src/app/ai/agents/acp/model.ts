import type {
  NewSessionResponse,
  SetSessionConfigOptionRequest,
  SetSessionConfigOptionResponse
} from '@agentclientprotocol/sdk'

import type { ACPAgentID } from '@open-pencil/core/constants'

import { AGENT_CONNECT_TIMEOUT_MS } from '@/app/integrations/mcp/link'
import { createDeferred } from '@/app/runtime/deferred'

import { CodexModelSelectionError } from './errors'

type SelectModel = (
  request: SetSessionConfigOptionRequest
) => Promise<SetSessionConfigOptionResponse>

// Codex's legacy catalog encodes the reasoning effort in brackets. The session selector uses
// base model IDs and may include the inherited value even when the catalog leaves it out.
function baseModel(id: string): string {
  return id.replace(/\[[^\]]+\]$/, '')
}

async function confirmSelection(select: SelectModel, request: SetSessionConfigOptionRequest) {
  const deadline = createDeferred<never>()
  const timer = setTimeout(
    () => deadline.reject(new Error('No model response')),
    AGENT_CONNECT_TIMEOUT_MS
  )
  try {
    const result = await Promise.race([select(request), deadline.promise])
    if (
      result.configOptions.find((option) => option.id === request.configId)?.currentValue !==
      request.value
    ) {
      throw new Error('The adapter did not confirm the selected model.')
    }
  } finally {
    clearTimeout(timer)
  }
}

/** Repairs an unsupported inherited Codex model before the first prompt, within this session. */
export async function selectACPChatModel(
  agent: ACPAgentID,
  session: NewSessionResponse,
  select: SelectModel
): Promise<string | null> {
  const models = session.models
  if (agent !== 'codex' || !models?.availableModels.length) return models?.currentModelId ?? null

  const model = session.configOptions?.find((option) => option.category === 'model')
  const current = model?.currentValue ?? baseModel(models.currentModelId)
  const available = new Set(models.availableModels.map(({ modelId }) => baseModel(modelId)))
  if (available.has(current)) return models.currentModelId

  const choices = model?.options.flatMap((option) =>
    'options' in option ? option.options : [option]
  )
  const fallback = choices?.find((choice) => available.has(choice.value))
  if (!model || !fallback) {
    throw new CodexModelSelectionError(
      `Codex model “${current}” is unavailable for this account. Choose an available model in Codex, then retry.`
    )
  }

  try {
    await confirmSelection(select, {
      sessionId: session.sessionId,
      configId: model.id,
      value: fallback.value
    })
  } catch (cause) {
    throw new CodexModelSelectionError(
      `Codex could not switch from the unavailable model “${current}” to “${fallback.value}”. Check the model in Codex, then retry.`,
      { cause }
    )
  }
  return fallback.value
}
