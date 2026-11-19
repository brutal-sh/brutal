import { i18n } from '#vue/i18n/create'

export const recoveryMessageDefaults = {
  dialogTitle: 'Recover unsaved work',
  dialogDescription: 'Open Pen found documents from a previous session.',
  restoreFailed: 'Could not restore this document.',
  discardFailed: 'Could not discard this recovery copy. Try again.',
  closeDescription: 'Save to update the original, or keep a backup to recover your edits later.',
  keepBackup: 'Close and Keep Backup',
  discardBackup: 'Discard Backup',
  keepBackupFailed: 'Could not keep the backup. The document is still open. Save or try again.',
  settingsTitle: 'Recovery',
  settingsDescription: 'Control local crash-recovery copies for unsaved documents.',
  preserveUnsavedWork: 'Automatically preserve unsaved work',
  preserveUnsavedWorkDescription:
    'Store local recovery copies so documents can be restored after an unexpected shutdown.',
  restore: 'Restore',
  discard: 'Discard'
} as const

export const recoveryMessages = i18n('recovery', recoveryMessageDefaults)
