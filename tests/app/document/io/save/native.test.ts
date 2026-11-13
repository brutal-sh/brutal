import { afterEach, expect, spyOn, test } from 'bun:test'

import { createEditor } from '@open-pencil/core'
import { SceneGraph } from '@open-pencil/scene-graph'

import { createDocumentChanges } from '@/app/document/io/changes'
import { createSourceSaveQueue } from '@/app/document/io/source/save/queue'
import { createDocumentWriter } from '@/app/document/io/write'
import { createInitialAppEditorState } from '@/app/editor/session/types'
import { toast } from '@/app/shell/ui'

import { asDouble } from '#tests/helpers/doubles'
import { clearTauriMocks, mockTauriIPC } from '#tests/helpers/tauri/mocks'

const disposals: Array<() => void> = []

afterEach(async () => {
  for (const dispose of disposals.splice(0)) dispose()
  await clearTauriMocks()
})

function owner(
  path: string | null = '/private/owned/attempted.pen',
  fileHandle: FileSystemFileHandle | null = null
) {
  const graph = new SceneGraph()
  const state = createInitialAppEditorState(graph.getPages()[0].id)
  const editor = createEditor({ graph, state })
  const changes = createDocumentChanges(editor)
  const afterSave: number[] = []
  const savedVersions: number[] = []
  const queue = createSourceSaveQueue(changes, async () => {
    afterSave.push(1)
  })
  const write = createDocumentWriter({
    state,
    getFilePath: () => path,
    getFileHandle: () => fileHandle,
    getStorageBinding: () => null,
    setSavedVersion: (version) => savedVersions.push(version),
    setLastWriteTime: () => undefined
  })
  graph.createNode('RECTANGLE', graph.getPages()[0].id, { width: 64, height: 64 })
  disposals.push(() => {
    queue.dispose()
    changes.dispose()
    editor.dispose()
  })
  return {
    changes,
    afterSave,
    savedVersions,
    queue,
    save: () => write(new Uint8Array([1, 2]), 17, 'pen')
  }
}

test('native permission refusal shows one file-specific alert and retains dirty edits until retry', async () => {
  let refused = true
  const alerts: unknown[] = []
  await mockTauriIPC((cmd, args) => {
    if (cmd === 'plugin:fs|write_file' && refused) {
      throw 'failed to write /private/owned/attempted.pen: Permission denied (os error 13)'
    }
    if (cmd === 'plugin:dialog|message') alerts.push(args)
    return null
  })
  const session = owner()
  const errorToast = spyOn(toast, 'error')
  disposals.push(() => errorToast.mockRestore())
  expect(await session.queue.userSave(session.save)).toBe(false)
  expect(session.changes.hasUnsavedChanges()).toBe(true)
  expect(session.savedVersions).toEqual([])
  expect(session.afterSave).toEqual([])
  expect(session.queue.lastFailure.value).toBe(true)
  expect(alerts).toHaveLength(1)
  expect(JSON.stringify(alerts)).toContain('attempted.pen')
  expect(JSON.stringify(alerts)).toContain('Save As')
  expect(JSON.stringify(alerts)).not.toContain('/private/owned')
  expect(JSON.stringify(alerts)).not.toContain('os error')
  expect(errorToast).not.toHaveBeenCalled()
  refused = false
  expect(await session.queue.userSave(session.save)).toBe(true)
  expect(session.changes.hasUnsavedChanges()).toBe(false)
  expect(session.savedVersions).toEqual([17])
  expect(session.afterSave).toEqual([1])
  expect(session.queue.lastFailure.value).toBe(false)
})

test('a failed native alert retains dismissible guidance on the document and keeps the save failed', async () => {
  await mockTauriIPC((cmd) => {
    if (cmd === 'plugin:fs|write_file') throw 'Permission denied (os error 13)'
    if (cmd === 'plugin:dialog|message') throw new Error('Native alert unavailable')
    return null
  })
  const session = owner()
  const errorToast = spyOn(toast, 'error')
  disposals.push(() => errorToast.mockRestore())
  expect(await session.queue.userSave(session.save)).toBe(false)
  expect(errorToast).not.toHaveBeenCalled()
  expect(session.queue.permissionFailure?.value).toBe('attempted.pen')
  session.queue.dismissPermissionFailure()
  expect(session.queue.permissionFailure.value).toBeNull()
  expect(session.queue.lastFailure.value).toBe(true)
  expect(session.changes.hasUnsavedChanges()).toBe(true)
  expect(session.savedVersions).toEqual([])
})

test('permission-like file names do not turn a different write failure into a permission alert', async () => {
  const alerts: unknown[] = []
  const failure =
    'failed to write Permission denied (os error 13).pen: No space left on device (os error 28)'
  await mockTauriIPC((cmd, args) => {
    if (cmd === 'plugin:fs|write_file') throw failure
    if (cmd === 'plugin:dialog|message') alerts.push(args)
    return null
  })
  const session = owner('/private/owned/Permission denied (os error 13).pen')
  const errorToast = spyOn(toast, 'error')
  disposals.push(() => errorToast.mockRestore())
  expect(await session.queue.userSave(session.save)).toBe(false)
  expect(alerts).toEqual([])
  expect(errorToast).toHaveBeenCalledWith('Operation failed: ' + failure)
  expect(session.changes.hasUnsavedChanges()).toBe(true)
  expect(session.savedVersions).toEqual([])
})

test('a browser file-handle refusal keeps its existing feedback and dirty edits', async () => {
  const session = owner(
    null,
    asDouble<FileSystemFileHandle>({
      name: 'browser.pen',
      createWritable: async () => {
        throw new DOMException('Permission denied (os error 13)', 'NotAllowedError')
      }
    })
  )
  const errorToast = spyOn(toast, 'error')
  disposals.push(() => errorToast.mockRestore())
  expect(await session.queue.userSave(session.save)).toBe(false)
  expect(errorToast).toHaveBeenCalledWith('Operation failed: Permission denied (os error 13)')
  expect(session.changes.hasUnsavedChanges()).toBe(true)
  expect(session.savedVersions).toEqual([])
})
