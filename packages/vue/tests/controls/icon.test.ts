import { expect, test } from 'bun:test'

import { noop } from 'es-toolkit'
import { createRenderer } from 'vue'

import { createEditor } from '@open-pencil/core'
import { parseIconName, type IconProvider } from '@open-pencil/core/icons'
import { readIcon } from '@open-pencil/scene-graph/icons'
import { parseSVGPath } from '@open-pencil/scene-graph/parse-path'

import { useIcon } from '#vue/controls/icon/use'
import { EDITOR_KEY } from '#vue/editor/context'

async function fixture() {
  let release: (() => void) | undefined
  const held = new Promise<void>((resolve) => {
    release = resolve
  })
  const provider: IconProvider = {
    async icons(names, size, options) {
      const weight = typeof options?.wght === 'number' ? options.wght : 200
      if (weight === 400) await held
      return new Map(
        names.map((name) => {
          const parsed = parseIconName(name)
          if (!parsed) throw new Error('Invalid fixture icon')
          return [
            name,
            {
              prefix: parsed.prefix,
              name: parsed.iconName,
              width: size,
              height: size,
              options: { ...options, wght: weight },
              paths: [
                {
                  vectorNetwork: parseSVGPath(`M0 0H${weight / 20}V24H0Z`),
                  fill: 'currentColor',
                  stroke: null,
                  strokeWidth: 0,
                  strokeCap: 'butt',
                  strokeJoin: 'miter'
                }
              ]
            }
          ]
        })
      )
    },
    previews: async () => new Map(),
    collections: async () => [],
    search: async () => ({ icons: [], total: 0, collections: {} }),
    browse: async () => []
  }
  const editor = createEditor({ icons: provider })
  const id = await editor.insertIcon('material-symbols-rounded:home')
  if (!id) throw new Error('Fixture icon missing')
  const other = editor.graph.createNode('RECTANGLE', editor.state.currentPageId, { x: 0 })
  let control: ReturnType<typeof useIcon> | undefined
  const renderer = createRenderer<Record<string, never>, Record<string, never>>({
    insert: noop,
    remove: noop,
    createElement: () => ({}),
    createText: () => ({}),
    createComment: () => ({}),
    setText: noop,
    setElementText: noop,
    parentNode: () => null,
    nextSibling: () => null,
    patchProp: noop
  })
  const app = renderer.createApp({
    setup() {
      control = useIcon()
      return () => null
    }
  })
  app.provide(EDITOR_KEY, editor)
  app.mount({})
  if (!control) throw new Error('Icon control missing')
  const weight = () => {
    const node = editor.graph.getNode(id)
    return node ? readIcon(node)?.options?.wght : undefined
  }
  return {
    editor,
    id,
    other,
    control,
    app,
    release: () => release?.(),
    weight
  }
}

test('cancelling a delayed weight preview preserves a later independent edit', async () => {
  const f = await fixture()
  try {
    f.control.setWeightEditing(true)
    await f.control.setWeight(300)
    const pending = f.control.setWeight(400)
    f.control.cancelWeight()
    f.editor.updateNodeWithUndo(f.other.id, { x: 42 }, 'Move another layer')
    f.release()
    await pending
    expect(f.other.x).toBe(42)
    expect(f.weight()).toBe(200)
    expect(f.editor.undo.undo()).toBe('Move another layer')
    expect(f.other.x).toBe(0)
    expect(f.editor.undo.undo()).toBe('Insert icon')
  } finally {
    f.release()
    f.app.unmount()
    f.editor.dispose()
  }
})

test('unmount commits only the last loaded weight as one step and aborts the pending result', async () => {
  const f = await fixture()
  try {
    f.control.setWeightEditing(true)
    await f.control.setWeight(300)
    const pending = f.control.setWeight(400)
    f.app.unmount()
    f.release()
    await pending
    expect(f.weight()).toBe(300)
    expect(f.editor.undo.undo()).toBe('Change icon weight')
    expect(f.weight()).toBe(200)
    expect(f.editor.undo.undo()).toBe('Insert icon')
  } finally {
    f.release()
    f.editor.dispose()
  }
})

test('selection commits the last loaded weight and invalidates an outstanding result', async () => {
  const f = await fixture()
  try {
    f.control.setWeightEditing(true)
    await f.control.setWeight(300)
    const pending = f.control.setWeight(400)
    f.editor.select([f.other.id])
    f.release()
    await pending
    expect(f.weight()).toBe(300)
    expect(f.editor.undo.undo()).toBe('Change icon weight')
    expect(f.weight()).toBe(200)
    expect(f.editor.undo.undo()).toBe('Insert icon')
  } finally {
    f.release()
    f.app.unmount()
    f.editor.dispose()
  }
})

test('an async weight commit stays separate from another edit batch', async () => {
  const f = await fixture()
  try {
    f.control.setWeightEditing(true)
    await f.control.setWeight(300)
    const pending = f.control.setWeight(400)
    f.control.setWeightEditing(false)
    f.editor.undo.beginBatch('Independent edits')
    f.editor.updateNodeWithUndo(f.other.id, { x: 42 }, 'Move another layer')
    f.release()
    await pending
    f.editor.undo.commitBatch()
    expect(f.weight()).toBe(400)
    expect(f.editor.undo.undo()).toBe('Independent edits')
    expect(f.other.x).toBe(0)
    expect(f.weight()).toBe(400)
    expect(f.editor.undo.undo()).toBe('Change icon weight')
    expect(f.weight()).toBe(200)
  } finally {
    f.release()
    f.app.unmount()
    f.editor.dispose()
  }
})

test('a later icon metadata edit ends pending weight ownership before it writes', async () => {
  const f = await fixture()
  try {
    f.control.setWeightEditing(true)
    await f.control.setWeight(300)
    const pending = f.control.setWeight(400)
    const frame = f.editor.graph.getNode(f.id)
    if (!frame) throw new Error('Fixture icon missing')
    const note = {
      pluginId: 'fixture.third-party',
      key: 'note',
      value: 'keep'
    }
    f.editor.updateNodeWithUndo(
      f.id,
      { pluginData: [...frame.pluginData, note] },
      'Set another property'
    )
    f.control.cancelWeight()
    f.release()
    await pending
    expect(f.weight()).toBe(300)
    expect(f.editor.graph.getNode(f.id)?.pluginData).toContainEqual(note)
    expect(f.editor.undo.undo()).toBe('Set another property')
    expect(f.weight()).toBe(300)
    expect(f.editor.undo.undo()).toBe('Change icon weight')
    expect(f.weight()).toBe(200)
  } finally {
    f.release()
    f.app.unmount()
    f.editor.dispose()
  }
})

test.each([{ held: false }, { held: true }])(
  'Undo settles an active weight gesture before history with pending=$held',
  async ({ held }) => {
    const f = await fixture()
    try {
      f.control.setWeightEditing(true)
      await f.control.setWeight(300)
      const pending = held ? f.control.setWeight(400) : Promise.resolve()
      expect(f.editor.undo.undo()).toBe('Change icon weight')
      expect(f.editor.graph.getNode(f.id)).toBeDefined()
      expect(f.weight()).toBe(200)
      f.release()
      await pending
      expect(f.weight()).toBe(200)
      expect(f.editor.undo.redo()).toBe('Change icon weight')
      expect(f.weight()).toBe(300)
    } finally {
      f.release()
      f.app.unmount()
      f.editor.dispose()
    }
  }
)
