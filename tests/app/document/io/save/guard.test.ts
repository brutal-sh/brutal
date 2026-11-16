import { expect, test } from 'bun:test'

import { createDefaultEditorState } from '@open-pencil/core'

import { createSaveActions } from '@/app/document/io/save/actions'
import { createDocumentSourceState } from '@/app/document/io/source/state'
import { createDeferred } from '@/app/runtime/deferred'

import { asDouble } from '#tests/helpers/doubles'

test('a cancelled encoded save never opens a writable or marks the document saved', async () => {
  const source = createDocumentSourceState()
  const entered = createDeferred<undefined>()
  const encoded = createDeferred<Uint8Array>()
  let writes = 0
  source.setFileHandle(
    asDouble<FileSystemFileHandle>({
      name: 'owned.pen',
      createWritable: async () => {
        writes++
        return { write: async () => undefined, close: async () => undefined }
      }
    })
  )
  const actions = createSaveActions({
    ...source,
    state: { ...createDefaultEditorState('owned-page'), documentName: 'Owned' },
    version: () => 4,
    buildFigFile: () => new Uint8Array(),
    buildPenFile: () => {
      entered.resolve(undefined)
      return encoded.promise
    },
    startWatchingFile: () => undefined
  })
  const controller = new AbortController()
  const pending = actions.saveFigFile(() => controller.signal.throwIfAborted())
  await entered.promise
  controller.abort()
  encoded.resolve(new Uint8Array([1, 2, 3]))
  await expect(pending).rejects.toThrow()
  expect(writes).toBe(0)
  expect(source.getSavedVersion()).toBe(0)
})
