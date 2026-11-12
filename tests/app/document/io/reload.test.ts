import { afterEach, expect, test } from 'bun:test'

import { ref } from 'vue'

import { createEditor } from '@open-pencil/core'
import { SceneGraph } from '@open-pencil/scene-graph'

import { createDocumentChanges } from '@/app/document/io/changes'
import { applyImportedDocument } from '@/app/document/io/imported-document'
import { createReloadActions } from '@/app/document/io/reload'
import { createSourceSaveQueue } from '@/app/document/io/source/save/queue'
import { createDocumentSourceState } from '@/app/document/io/source/state'
import { createEditorPreparationController } from '@/app/editor/preparation/controller'
import { createInitialAppEditorState } from '@/app/editor/session/types'

import { asDouble } from '#tests/helpers/doubles'

function externalFile(name = 'External version') {
  return new File(
    [
      JSON.stringify({
        version: '2.21',
        children: [
          {
            id: 'external',
            type: 'rectangle',
            name,
            width: 91,
            height: 53,
            fill: '#ef4444'
          }
        ]
      })
    ],
    'existing.pen'
  )
}

function owner(read = async () => externalFile(), onSave?: (count: number) => void) {
  const graph = new SceneGraph()
  const state = createInitialAppEditorState(graph.getPages()[0].id)
  state.documentName = 'existing'
  const editor = createEditor({ graph, state })
  const source = createDocumentSourceState()
  const version = ref(0)
  const dirty = ref(false)
  let reads = 0
  let saves = 0
  source.setFileHandle(
    asDouble<FileSystemFileHandle>({
      getFile: async () => {
        reads++
        return read()
      }
    })
  )
  const preparation = createEditorPreparationController(state)
  const actions = createReloadActions({
    editor,
    state,
    ...source,
    preparationController: preparation,
    hasUnsavedChanges: () => dirty.value,
    captureVersion: () => version.value,
    markDocumentSaved: () => {
      dirty.value = false
      saves++
      onSave?.(saves)
    }
  })
  const session = {
    graph,
    editor,
    source,
    version,
    dirty,
    actions,
    reads: () => reads,
    saves: () => saves,
    dispose: () => {
      actions.dispose()
      preparation.dispose()
      editor.dispose()
    }
  }
  disposals.push(session.dispose)
  return session
}

const disposals: Array<() => void> = []
afterEach(() => {
  for (const dispose of disposals.splice(0)) dispose()
})

test('dirty watcher notifications do not read or replace the source until approval', async () => {
  const session = owner()
  session.dirty.value = true
  await session.actions.reloadFromDisk()
  await session.actions.reloadFromDisk()
  expect(session.reads()).toBe(0)
  expect(session.editor.graph).toBe(session.graph)
  expect(session.actions.externalFileChange.value).toBe(true)
  session.actions.ignoreExternalFileChange()
  expect(session.actions.externalFileChange.value).toBe(false)
  expect(session.dirty.value).toBe(true)
  expect(session.saves()).toBe(0)
})

test('clean files reload normally and explicit approval replaces a dirty version', async () => {
  for (const dirty of [false, true]) {
    const session = owner()
    session.dirty.value = dirty
    await session.actions.reloadFromDisk()
    if (dirty) await session.actions.reloadExternalFileChange()
    expect(session.editor.graph).not.toBe(session.graph)
    expect(
      [...session.editor.graph.nodes.values()].some((node) => node.name === 'External version')
    ).toBe(true)
    expect(session.saves()).toBe(1)
    expect(session.dirty.value).toBe(false)
    expect(session.actions.externalFileChange.value).toBe(false)
  }
})

test('edits arriving during a source read retain the live version and request a decision', async () => {
  let release: ((file: File) => void) | undefined
  const held = new Promise<File>((resolve) => {
    release = resolve
  })
  const session = owner(() => held)
  const loading = session.actions.reloadFromDisk()
  session.version.value++
  session.dirty.value = true
  if (!release) throw new Error('Read gate missing')
  release(externalFile())
  await loading
  expect(session.editor.graph).toBe(session.graph)
  expect(session.saves()).toBe(0)
  expect(session.dirty.value).toBe(true)
  expect(session.actions.externalFileChange.value).toBe(true)
})

test('an obsolete pending decision cannot reload a different source', async () => {
  const session = owner()
  session.dirty.value = true
  await session.actions.reloadFromDisk()
  session.source.setFileHandle(asDouble<FileSystemFileHandle>({ name: 'different.pen' }))
  expect(session.actions.externalFileChange.value).toBe(false)
  await session.actions.reloadExternalFileChange()
  expect(session.reads()).toBe(0)
  expect(session.editor.graph).toBe(session.graph)
  expect(session.dirty.value).toBe(true)
})

for (const change of ['source', 'dispose'] as const) {
  test(`${change} invalidates an in-flight read before it replaces the graph`, async () => {
    let release: ((file: File) => void) | undefined
    const held = new Promise<File>((resolve) => {
      release = resolve
    })
    const session = owner(() => held)
    const loading = session.actions.reloadFromDisk()
    if (change === 'source')
      session.source.setFileHandle(asDouble<FileSystemFileHandle>({ name: 'other.pen' }))
    else session.actions.dispose()
    if (!release) throw new Error('Read gate missing')
    release(externalFile())
    await loading
    expect(session.editor.graph).toBe(session.graph)
    expect(session.saves()).toBe(0)
    expect(session.actions.externalFileChange.value).toBe(false)
  })
}

test('a second watcher notification rereads the newest source after an in-flight reload', async () => {
  let release: ((file: File) => void) | undefined
  let finished: (() => void) | undefined
  const held = new Promise<File>((resolve) => {
    release = resolve
  })
  const secondSave = new Promise<void>((resolve) => {
    finished = resolve
  })
  let calls = 0
  const session = owner(
    () => (++calls === 1 ? held : Promise.resolve(externalFile('Newest version'))),
    (count) => {
      if (count === 2) finished?.()
    }
  )
  const loading = session.actions.reloadFromDisk()
  await session.actions.reloadFromDisk()
  if (!release) throw new Error('Read gate missing')
  release(externalFile('Older version'))
  await loading
  await secondSave
  expect(session.reads()).toBe(2)
  expect(
    [...session.editor.graph.nodes.values()].some((node) => node.name === 'Newest version')
  ).toBe(true)
})

test('staging rechecks the commit boundary after asynchronous page preparation', async () => {
  const session = owner()
  const imported = new SceneGraph()
  let stale = false
  const loading = applyImportedDocument(session.editor, imported, undefined, () => {
    if (stale) throw new DOMException('Newer edits', 'AbortError')
  })
  stale = true
  await expect(loading).rejects.toHaveProperty('name', 'AbortError')
  expect(session.editor.graph).toBe(session.graph)
})

test('a failed approved reload preserves work and a visible retry decision', async () => {
  let refused = true
  const session = owner(async () => {
    if (refused) throw new DOMException('Owned read refused', 'NotReadableError')
    return externalFile()
  })
  session.dirty.value = true
  await session.actions.reloadFromDisk()
  await session.actions.reloadExternalFileChange()
  expect(session.editor.graph).toBe(session.graph)
  expect(session.actions.externalFileChange.value).toBe(true)
  expect(session.actions.lastReloadFailed.value).toBe(true)
  expect(session.dirty.value).toBe(true)
  expect(session.saves()).toBe(0)
  refused = false
  await session.actions.reloadExternalFileChange()
  expect(session.saves()).toBe(1)
  expect(session.actions.lastReloadFailed.value).toBe(false)
})

test('copy cancellation differs from a failed save and a successful retry clears the failure', async () => {
  const session = owner()
  const changes = createDocumentChanges(session.editor)
  const queue = createSourceSaveQueue(changes, async () => undefined)
  try {
    expect(await queue.userSave(async () => false)).toBe(false)
    expect(queue.lastFailure.value).toBe(false)
    expect(
      await queue.userSave(async () => {
        throw new Error('Owned write refused')
      })
    ).toBe(false)
    expect(queue.lastFailure.value).toBe(true)
    expect(await queue.userSave(async () => true)).toBe(true)
    expect(queue.lastFailure.value).toBe(false)
  } finally {
    queue.dispose()
    changes.dispose()
  }
})
