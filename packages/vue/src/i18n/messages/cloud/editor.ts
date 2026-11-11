import { i18n } from '#vue/i18n/create'

import { cloudConnectionDefaults } from './editor/connection'
import { cloudDocumentDefaults } from './editor/documents'
import { cloudHistoryDefaults } from './editor/history'
import { cloudWorkspaceDefaults } from './editor/workspace'

export const cloudMessageDefaults = {
  ...cloudConnectionDefaults,
  ...cloudDocumentDefaults,
  ...cloudWorkspaceDefaults,
  ...cloudHistoryDefaults
} as const

export const cloudMessages = i18n('cloud', cloudMessageDefaults)
