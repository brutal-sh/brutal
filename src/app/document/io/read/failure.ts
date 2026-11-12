import { describeDiagnosticError, recordDocumentFailure } from '@/app/diagnostics'
import { viewDiagnosticsAction } from '@/app/diagnostics/view'
import type { EditorPreparationHandle } from '@/app/editor/preparation/types'
import { notificationMessages } from '@/app/i18n/notifications'
import { toast } from '@/app/shell/ui'

type ReadFailureDetails = {
  name: string
  format: Parameters<typeof recordDocumentFailure>[0]['format']
}

export function reportDocumentReadFailure(
  load: EditorPreparationHandle,
  details: ReadFailureDetails,
  error: unknown
) {
  if (load.signal.aborted) return
  const diagnostic = describeDiagnosticError(error)
  load.fail({
    code: 'decode-failed',
    message: error instanceof Error ? error.message : String(error),
    retryable: diagnostic.retryable ?? true
  })
  recordDocumentFailure({
    operation: 'open',
    format: details.format,
    ...diagnostic,
    retryable: diagnostic.retryable
  })
  toast.error(
    notificationMessages.get().openFileFailed({
      name: details.name,
      error: error instanceof Error ? error.message : String(error)
    }),
    viewDiagnosticsAction()
  )
}
