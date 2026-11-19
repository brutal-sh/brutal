import type { ClosableDocument } from './controller'
import { requestDocumentClose } from './prompt'
import { keepDocumentBackup, type RecoverableCloseDocument } from './recovery'

type OpenDocument = ClosableDocument &
  RecoverableCloseDocument & {
    state: { documentName: string }
    persistRecoveryNow(): Promise<void>
    discardRecovery(): Promise<void>
  }

export async function confirmAllDocuments(
  getDocuments: () => OpenDocument[],
  confirm: typeof requestDocumentClose = requestDocumentClose
): Promise<boolean> {
  const documents = getDocuments()
  const discarded = new Set<OpenDocument>()
  const retained = new Map<OpenDocument, number>()
  function canClose() {
    const current = getDocuments()
    return (
      current.length === documents.length &&
      current.every((document) => {
        if (!documents.includes(document)) return false
        const version = retained.get(document)
        if (version !== undefined) return document.getRecoveryCloseVersion() === version
        return discarded.has(document) || !document.hasUnsavedChanges()
      })
    )
  }
  for (const document of documents) {
    const choice = await confirm(document, document.state.documentName)
    if (choice === 'cancel') return false
    if (choice === 'discard') discarded.add(document)
    if (typeof choice === 'object') retained.set(document, choice.keepBackupVersion)
  }
  if (!canClose()) return false
  for (const [document, version] of retained) {
    if (!(await keepDocumentBackup(document, version))) return false
  }
  if (!canClose()) return false
  for (const document of documents) {
    if (discarded.has(document)) await document.discardRecovery()
    else if (!retained.has(document)) await document.persistRecoveryNow()
  }
  return canClose()
}
