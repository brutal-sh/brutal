import type { Editor } from '@open-pencil/core'
import type { IORegistry } from '@open-pencil/core/io'

import type { createExportTargetActions } from './files'
import type { DownloadBlob } from './types'

export interface ExportContext {
  editor: Editor
  io: IORegistry
  downloadBlob: DownloadBlob
  prepareExportTarget: ReturnType<typeof createExportTargetActions>['prepareExportTarget']
}
