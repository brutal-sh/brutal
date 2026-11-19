import { recoveryMessages } from '@open-pencil/vue/i18n'

import { toast } from '@/app/shell/ui'

export interface RecoverableCloseDocument {
  getRecoveryCloseVersion(): number | null
  retainRecoveryOnClose(version: number): Promise<boolean>
}

export async function keepDocumentBackup(
  document: RecoverableCloseDocument,
  version: number
): Promise<boolean> {
  try {
    if (await document.retainRecoveryOnClose(version)) return true
  } catch (error) {
    console.warn('[Recovery] Could not retain backup on close:', error)
  }
  toast.error(recoveryMessages.get().keepBackupFailed)
  return false
}
