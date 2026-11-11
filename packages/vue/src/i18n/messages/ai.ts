import { i18n } from '#vue/i18n/create'

import { aiChatDefaults } from './ai/chat'
import { aiFailureDefaults } from './ai/failures'
import { aiModelDefaults } from './ai/models'
import { aiSetupDefaults } from './ai/setup'

export const aiMessageDefaults = {
  ...aiChatDefaults,
  ...aiModelDefaults,
  ...aiFailureDefaults,
  ...aiSetupDefaults
} as const

export const aiMessages = i18n('ai', aiMessageDefaults)
