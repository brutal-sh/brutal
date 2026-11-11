import { OPENAI_MODELS } from './openai'
import type { AIProviderDef, AIProviderID } from './types'

export const HARNESS_PROVIDER_ID = 'harness:pi' as const

export const AI_PROVIDERS: AIProviderDef[] = [
  {
    id: HARNESS_PROVIDER_ID,
    name: 'Pi',
    keyPlaceholder: 'AI Gateway key (optional)',
    keyURL: '',
    defaultModel: '',
    supportsCustomModel: true,
    models: []
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    keyPlaceholder: 'sk-or-…',
    keyURL: 'https://openrouter.ai/keys',
    defaultModel: 'anthropic/claude-sonnet-5.5',
    supportsCustomModel: true,
    models: [
      {
        id: 'anthropic/claude-sonnet-5.5',
        name: 'Claude Sonnet 5.5',
        tag: 'Best for design',
        capabilities: ['tools', 'vision']
      },
      {
        id: 'anthropic/claude-opus-5.5',
        name: 'Claude Opus 5.5',
        tag: 'Deep reasoning',
        capabilities: ['tools', 'vision']
      },
      {
        id: 'anthropic/claude-fable-5.1',
        name: 'Claude Fable 5.1',
        tag: 'Most capable',
        capabilities: ['tools', 'vision']
      },
      {
        id: 'anthropic/claude-haiku-5.5',
        name: 'Claude Haiku 5.5',
        tag: 'Fast',
        capabilities: ['tools', 'vision']
      },
      {
        id: 'openai/gpt-6.1-sol',
        name: 'GPT-6.1 Sol',
        tag: 'Latest OpenAI',
        capabilities: ['tools', 'vision']
      },
      {
        id: 'google/gemini-3.8-flash',
        name: 'Gemini 3.8 Flash',
        tag: 'Fast',
        capabilities: ['tools', 'vision']
      },
      { id: 'z-ai/glm-5.3', name: 'GLM-5.3', capabilities: ['tools'] },
      {
        id: 'deepseek/deepseek-v4-pro',
        name: 'DeepSeek V4 Pro',
        tag: 'Reasoning',
        capabilities: ['tools']
      },
      {
        id: 'moonshotai/kimi-k3',
        name: 'Kimi K3',
        tag: 'Vision + code',
        capabilities: ['tools', 'vision']
      },
      {
        id: 'minimax/minimax-m3.1-flash:free',
        name: 'MiniMax-M3.1-Flash',
        tag: 'Free',
        capabilities: ['tools', 'vision']
      },
      {
        id: 'google/gemma-4-31b-it:free',
        name: 'Gemma 4 31B',
        tag: 'Free',
        capabilities: ['tools', 'vision']
      }
    ]
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    keyPlaceholder: 'sk-ant-…',
    keyURL: 'https://console.anthropic.com/settings/keys',
    defaultModel: 'claude-sonnet-5-5',
    models: [
      {
        id: 'claude-sonnet-5-5',
        name: 'Claude Sonnet 5.5',
        tag: 'Best for design',
        capabilities: ['tools', 'vision']
      },
      {
        id: 'claude-opus-5-5',
        name: 'Claude Opus 5.5',
        tag: 'Deep reasoning',
        capabilities: ['tools', 'vision']
      },
      {
        id: 'claude-fable-5-1',
        name: 'Claude Fable 5.1',
        tag: 'Most capable',
        capabilities: ['tools', 'vision']
      },
      {
        id: 'claude-haiku-5-5',
        name: 'Claude Haiku 5.5',
        tag: 'Fast',
        capabilities: ['tools', 'vision']
      }
    ]
  },
  {
    id: 'openai',
    name: 'OpenAI',
    keyPlaceholder: 'sk-…',
    keyURL: 'https://platform.openai.com/api-keys',
    defaultModel: 'gpt-6.1-sol',
    models: OPENAI_MODELS
  },
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    keyPlaceholder: '',
    keyURL: '',
    defaultModel: 'gpt-6.1-sol',
    signInOnly: true,
    // The Codex backend rejects minimal effort on every model.
    models: OPENAI_MODELS.map((model) => ({ ...model, minReasoningEffort: 'low' }))
  },
  {
    id: 'google',
    name: 'Google AI',
    keyPlaceholder: 'AIza…',
    keyURL: 'https://aistudio.google.com/apikey',
    defaultModel: 'gemini-3.8-flash',
    models: [
      {
        id: 'gemini-3.8-flash',
        name: 'Gemini 3.8 Flash',
        tag: 'Best',
        capabilities: ['tools', 'vision']
      },
      {
        id: 'gemini-4-argon',
        name: 'Gemini 4 Argon',
        tag: 'Most capable',
        capabilities: ['tools', 'vision'],
        minReasoningEffort: 'low'
      },
      {
        id: 'gemini-flash-latest',
        name: 'Gemini Flash Latest',
        tag: 'Alias',
        capabilities: ['tools', 'vision']
      },
      {
        id: 'gemini-3.1-pro-preview',
        name: 'Gemini 3.1 Pro',
        tag: 'Pro',
        capabilities: ['tools', 'vision'],
        minReasoningEffort: 'low'
      }
    ]
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    keyPlaceholder: 'sk-…',
    keyURL: 'https://platform.deepseek.com/api_keys',
    defaultModel: 'deepseek-flash',
    models: [
      { id: 'deepseek-flash', name: 'DeepSeek Flash', tag: 'Fast' },
      { id: 'deepseek-v4-pro', name: 'DeepSeek V4 Pro', tag: 'Reasoning' }
    ]
  },
  {
    id: 'zai',
    name: 'Z.ai',
    keyPlaceholder: 'API key',
    keyURL: 'https://docs.z.ai/devpack/quick-start',
    defaultModel: 'glm-5.3',
    models: [
      { id: 'glm-5.3', name: 'GLM-5.3', tag: 'Best', minReasoningEffort: 'low' },
      {
        id: 'glm-5.3-flash',
        name: 'GLM-5.3-Flash',
        tag: 'Fast',
        capabilities: ['tools', 'vision'],
        minReasoningEffort: 'low'
      },
      {
        id: 'glm-5.3-flashx',
        name: 'GLM-5.3-FlashX',
        capabilities: ['tools', 'vision'],
        minReasoningEffort: 'low'
      },
      {
        id: 'glm-5v-turbo',
        name: 'GLM-5V-Turbo',
        tag: 'Vision',
        capabilities: ['tools', 'vision']
      },
      { id: 'glm-5.2', name: 'GLM-5.2' },
      { id: 'glm-4.7-flash', name: 'GLM-4.7-Flash', tag: 'Free' }
    ]
  },
  {
    id: 'minimax',
    name: 'MiniMax',
    keyPlaceholder: 'API key',
    keyURL: 'https://platform.minimax.io/user-center/basic-information/interface-key',
    defaultModel: 'MiniMax-M3.1-Flash',
    models: [
      {
        id: 'MiniMax-M3.1-Flash',
        name: 'MiniMax-M3.1-Flash',
        tag: 'Best',
        minReasoningEffort: 'low'
      },
      { id: 'MiniMax-M3', name: 'MiniMax-M3' }
    ]
  },
  {
    id: 'openai-compatible',
    name: 'OpenAI-compatible',
    keyPlaceholder: 'API key',
    keyURL: '',
    defaultModel: '',
    models: [],
    supportsCustomBaseURL: true,
    supportsCustomModel: true
  },
  {
    id: 'anthropic-compatible',
    name: 'Anthropic-compatible',
    keyPlaceholder: 'API key',
    keyURL: '',
    defaultModel: '',
    models: [],
    supportsCustomBaseURL: true,
    supportsCustomModel: true
  },
  {
    id: 'openpencil',
    name: 'Cloud',
    keyPlaceholder: '',
    keyURL: '',
    defaultModel: '',
    models: []
  }
]

export const DEFAULT_AI_PROVIDER: AIProviderID = 'openai-compatible'

export const DEFAULT_AI_MODEL =
  AI_PROVIDERS.find((provider) => provider.id === DEFAULT_AI_PROVIDER)?.defaultModel ?? ''
