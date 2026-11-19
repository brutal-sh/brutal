import { computed, shallowRef } from 'vue'

import { applyImportedDocument } from '@/app/document/io/imported-document'
import { reportDocumentReadFailure } from '@/app/document/io/read/failure'
import { readReloadSource } from '@/app/document/io/reload/source'
import { captureReloadState, restoreReloadState } from '@/app/document/io/reload/state'
import type { DocumentSourceOptions } from '@/app/document/io/source/types'
import type { DocumentSourceIdentity } from '@/app/document/io/types'
import type { EditorPreparationController } from '@/app/editor/preparation/controller'

type ReloadActionsOptions = Pick<
  DocumentSourceOptions,
  'editor' | 'state' | 'getFilePath' | 'getFileHandle'
> & {
  hasUnsavedChanges: () => boolean
  captureVersion: () => number
  markDocumentSaved: () => void
  setNativeSourceVersion?: (path: string, hash: string) => void
  preparationController: EditorPreparationController
}

type ReloadResult = 'applied' | 'cancelled' | 'failed'

async function readAndApplyReload(
  options: ReloadActionsOptions,
  assertCurrent: () => void
): Promise<ReloadResult> {
  const load = options.preparationController.begin({
    kind: 'document-reload',
    subject: options.state.documentName
  })
  try {
    const snapshot = captureReloadState(options.state)
    load.update({ phase: 'reading', detail: options.state.documentName })
    const filePath = options.getFilePath()
    let nativeHash: string | undefined
    const imported = await readReloadSource({
      documentName: options.state.documentName,
      filePath,
      fileHandle: options.getFileHandle(),
      signal: load.signal,
      onNativeRead: (hash) => {
        nativeHash = hash
      }
    })
    assertCurrent()
    if (imported) {
      await applyImportedDocument(options.editor, imported, load, assertCurrent)
      restoreReloadState(options.editor, options.state, snapshot)
      options.editor.requestRender()
      if (filePath && nativeHash) options.setNativeSourceVersion?.(filePath, nativeHash)
      options.markDocumentSaved()
    }
    load.complete()
    return 'applied'
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      load.cancel('superseded')
      return 'cancelled'
    }
    reportDocumentReadFailure(load, { name: options.state.documentName, format: 'fig' }, error)
    return 'failed'
  }
}

function createReloadConflict(options: ReloadActionsOptions) {
  const source = shallowRef<DocumentSourceIdentity | null>(null)
  const failed = shallowRef(false)
  const readSource = () => ({
    path: options.getFilePath(),
    handle: options.getFileHandle()
  })
  const isCurrent = (target: DocumentSourceIdentity) =>
    options.getFilePath() === target.path && options.getFileHandle() === target.handle
  const pending = computed(() => source.value !== null && isCurrent(source.value))
  const clear = () => {
    source.value = null
    failed.value = false
  }
  return {
    pending,
    failed,
    readSource,
    isCurrent,
    clear,
    offer: (target = readSource()) => {
      source.value = target
      failed.value = false
    },
    fail: (target: DocumentSourceIdentity) => {
      source.value = target
      failed.value = true
    },
    consume: () => {
      const target = source.value
      clear()
      return target && isCurrent(target) ? target : null
    }
  }
}

type ReloadAttempt = {
  source: DocumentSourceIdentity
  version: number
  isDisposed: () => boolean
  conflict: ReturnType<typeof createReloadConflict>
}

function assertReloadCurrent(options: ReloadActionsOptions, attempt: ReloadAttempt) {
  const { conflict, source, isDisposed } = attempt
  if (!isDisposed() && conflict.isCurrent(source) && options.captureVersion() === attempt.version)
    return
  if (!isDisposed() && conflict.isCurrent(source)) conflict.offer(source)
  throw new DOMException('Document changed during reload', 'AbortError')
}

function retainFailedReload(options: ReloadActionsOptions, attempt: ReloadAttempt) {
  if (
    !attempt.isDisposed() &&
    attempt.conflict.isCurrent(attempt.source) &&
    options.hasUnsavedChanges()
  )
    attempt.conflict.fail(attempt.source)
}

export function createReloadActions(options: ReloadActionsOptions) {
  const conflict = createReloadConflict(options)
  let disposed = false
  let reading = false
  let queued = false
  const isDisposed = () => disposed

  async function reloadFromDisk(approved = false) {
    if (isDisposed()) return
    if (reading) {
      queued = true
      return
    }
    if (!approved && options.hasUnsavedChanges()) {
      conflict.offer()
      return
    }
    conflict.clear()
    const attempt: ReloadAttempt = {
      source: conflict.readSource(),
      version: options.captureVersion(),
      isDisposed,
      conflict
    }
    const assertCurrent = () => assertReloadCurrent(options, attempt)
    reading = true
    try {
      const loaded = await readAndApplyReload(options, assertCurrent)
      if (loaded === 'failed') retainFailedReload(options, attempt)
    } finally {
      reading = false
      if (queued && !isDisposed()) {
        queued = false
        void reloadFromDisk()
      }
    }
  }

  return {
    reloadFromDisk,
    externalFileChange: conflict.pending,
    lastReloadFailed: conflict.failed,
    ignoreExternalFileChange: conflict.clear,
    reloadExternalFileChange: async () => {
      if (conflict.consume()) await reloadFromDisk(true)
    },
    dispose: () => {
      disposed = true
      conflict.clear()
    }
  }
}
