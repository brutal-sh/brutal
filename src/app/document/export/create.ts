import type { Editor, EditorState } from '@open-pencil/core'
import type { BuiltinIOFormatId, ExportRequest, IORegistry } from '@open-pencil/core/io'

import { createExportTargetActions } from './files'
import { exportTarget, exportTargets } from './requests'
import type { DownloadBlob, ExportDelivery, ExportOptions, ExportTargetRequest } from './types'

export function createDocumentExportActions(
  editor: Editor,
  state: EditorState,
  io: IORegistry,
  downloadBlob: DownloadBlob
) {
  const targets = createExportTargetActions(editor, state, io)
  const context = { editor, io, downloadBlob, prepareExportTarget: targets.prepareExportTarget }
  const actions = {
    exportTarget(
      target: ExportRequest['target'],
      formatId: string,
      options?: ExportOptions,
      delivery?: ExportDelivery
    ) {
      return exportTarget(context, { target, formatId, options }, delivery)
    },
    exportTargets(requests: ExportTargetRequest[]) {
      return exportTargets(context, requests)
    },
    async exportSelection(scale: number, formatId: BuiltinIOFormatId) {
      const target = targets.getSelectionExportTarget()
      if (formatId === 'svg' && target.scope === 'selection' && target.nodeIds.length > 1)
        return actions.exportTargets(
          target.nodeIds.map((nodeId) => ({ target: { scope: 'node', nodeId }, formatId }))
        )
      await actions.exportTarget(target, formatId, { scale })
    }
  }
  return {
    renderExportImage: targets.renderExportImage,
    listSelectionExportFormats: targets.listSelectionExportFormats,
    ...actions
  }
}
