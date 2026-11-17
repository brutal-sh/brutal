import { describe, expect, mock, test } from 'bun:test'

import type { NewSessionResponse, SessionConfigOption } from '@agentclientprotocol/sdk'

import { selectACPChatModel } from '@/app/ai/agents/acp/model'

const supported = { value: 'supported', name: 'Supported' }
const model: SessionConfigOption = {
  id: 'session-model',
  name: 'Model',
  type: 'select',
  category: 'model',
  currentValue: 'stale',
  options: [
    {
      group: 'models',
      name: 'Models',
      options: [{ value: 'stale', name: 'Stale inherited choice' }, supported]
    }
  ]
}
const session: NewSessionResponse = {
  sessionId: 'test-session',
  models: {
    currentModelId: 'stale[high]',
    availableModels: [{ modelId: 'supported[high]', name: 'Supported' }]
  },
  configOptions: [model]
}

describe('Codex chat model selection', () => {
  test('chooses a catalog-backed base model and confirms it for this session', async () => {
    const select = mock(async () => ({ configOptions: [{ ...model, currentValue: 'supported' }] }))
    await expect(selectACPChatModel('codex', session, select)).resolves.toBe('supported')
    expect(select).toHaveBeenCalledTimes(1)
    expect(select).toHaveBeenCalledWith({
      sessionId: 'test-session',
      configId: 'session-model',
      value: 'supported'
    })
  })

  test('keeps a compatible inherited choice', async () => {
    const select = mock(async () => ({ configOptions: [] }))
    const compatible = {
      ...session,
      models: {
        currentModelId: 'supported[high]',
        availableModels: [{ modelId: 'supported[high]', name: 'Supported' }]
      },
      configOptions: [{ ...model, currentValue: 'supported' }]
    }
    await expect(selectACPChatModel('codex', compatible, select)).resolves.toBe('supported[high]')
    expect(select).not.toHaveBeenCalled()
  })

  test('leaves other agents and sessions without a catalog alone', async () => {
    const select = mock(async () => ({ configOptions: [] }))
    await expect(selectACPChatModel('claude-code', session, select)).resolves.toBe('stale[high]')
    await expect(
      selectACPChatModel('codex', { sessionId: 'no-catalog' }, select)
    ).resolves.toBeNull()
    expect(select).not.toHaveBeenCalled()
  })

  test('reports the inherited model if the adapter exposes no compatible choice', async () => {
    const select = mock(async () => ({ configOptions: [] }))
    const unavailable = { ...session, configOptions: [{ ...model, options: [] }] }
    await expect(selectACPChatModel('codex', unavailable, select)).rejects.toThrow(/model.*stale/)
    expect(select).not.toHaveBeenCalled()
  })

  test('fails startup if the adapter responds without switching models', async () => {
    const select = mock(async () => ({ configOptions: [model] }))
    await expect(selectACPChatModel('codex', session, select)).rejects.toThrow(/stale.*supported/)
    expect(select).toHaveBeenCalledTimes(1)
  })
})
