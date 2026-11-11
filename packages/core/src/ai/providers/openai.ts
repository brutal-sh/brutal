import type { ModelOption } from './types'

export const OPENAI_MODELS: ModelOption[] = [
  {
    id: 'gpt-6.1-sol',
    name: 'GPT-6.1 Sol',
    tag: 'Best',
    capabilities: ['tools', 'vision'],
    minReasoningEffort: 'low'
  },
  {
    id: 'gpt-6-astra',
    name: 'GPT-6 Astra',
    tag: 'Smartest',
    capabilities: ['tools', 'vision'],
    minReasoningEffort: 'low'
  },
  { id: 'gpt-6-luna', name: 'GPT-6 Luna', tag: 'Fast', capabilities: ['tools', 'vision'] }
]
