export type CloseChoice = 'save' | 'discard' | 'cancel' | 'keep-backup'
export type CloseResult = 'saved' | 'discard' | 'cancel' | { keepBackupVersion: number }

export interface ClosableDocument {
  hasUnsavedChanges(): boolean
  saveFigFile(): Promise<boolean>
  getRecoveryCloseVersion?(): number | null
}

export async function confirmDocumentClose(
  document: ClosableDocument,
  choose: (canKeepBackup: boolean) => Promise<CloseChoice>
): Promise<CloseResult> {
  if (!document.hasUnsavedChanges()) return 'saved'
  const choice = await choose(document.getRecoveryCloseVersion?.() != null)
  if (choice === 'keep-backup') {
    const version = document.getRecoveryCloseVersion?.()
    return version == null ? 'cancel' : { keepBackupVersion: version }
  }
  if (choice !== 'save') return choice
  const saved = await document.saveFigFile()
  return saved && !document.hasUnsavedChanges() ? 'saved' : 'cancel'
}
