import { i18n } from '#vue/i18n/create'

import { cloudAccessDefaults } from './portal/access'
import { cloudAccountDefaults } from './portal/account'
import { cloudAdminDefaults } from './portal/admin'

export const cloudPortalMessageDefaults = {
  ...cloudAccessDefaults,
  ...cloudAccountDefaults,
  ...cloudAdminDefaults
} as const

export const cloudPortalMessages = i18n('cloudPortal', cloudPortalMessageDefaults)
