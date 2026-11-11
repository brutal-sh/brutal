import type { ACPAgentID } from '#core/ai/agents'

export type AIProviderID =
  | 'openrouter'
  | 'anthropic'
  | 'openai'
  | 'chatgpt'
  | 'google'
  | 'deepseek'
  | 'openai-compatible'
  | 'zai'
  | 'minimax'
  | 'anthropic-compatible'
  | 'openpencil'
  | 'harness:pi'
  | `acp:${ACPAgentID}`

export const REASONING_EFFORTS = ['minimal', 'low', 'medium', 'high', 'xhigh'] as const

export type ReasoningEffort = (typeof REASONING_EFFORTS)[number]

export interface ModelOption {
  id: string
  name: string
  tag?: string
  capabilities?: readonly ('tools' | 'vision')[]
  recommendedMaxOutputTokens?: number
  releaseDate?: string
  status?: 'active' | 'beta' | 'deprecated'
  /** Lowest reasoning effort the model accepts; lower thinking levels, Off included, use it. */
  minReasoningEffort?: ReasoningEffort
}

export interface AIProviderDef {
  id: AIProviderID
  name: string
  keyPlaceholder: string
  keyURL: string
  models: ModelOption[]
  defaultModel: string
  supportsCustomBaseURL?: boolean
  supportsCustomModel?: boolean
  /** The credential comes from signing in to an account; there is no key to paste. */
  signInOnly?: boolean
}
