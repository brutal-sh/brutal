import { expect, test } from 'bun:test'

import type { BuiltinIOFormatId } from '@open-pencil/core/io'

import { createExportMenuActions } from '@/app/shell/menu/actions/export'

test('menu export passes the selected format to the document export pipeline', async () => {
  const requested: BuiltinIOFormatId[] = []
  const state = { selectedIds: new Set(['selected-frame']) }
  const actions = createExportMenuActions({
    state,
    async exportSelection(scale, format) {
      expect(scale).toBe(1)
      requested.push(format)
    }
  })
  await actions['export-pdf']()
  await actions['export-png']()
  await actions['export-jpeg']()
  await actions['export-webp']()
  expect(requested).toEqual(['pdf', 'png', 'jpg', 'webp'])
  state.selectedIds.clear()
  await actions['export-pdf']()
  expect(requested).toHaveLength(4)
})

test('menu export preserves failure so callers cannot claim a successful save', async () => {
  const actions = createExportMenuActions({
    state: { selectedIds: new Set(['selected-frame']) },
    async exportSelection() {
      throw new Error('Destination is unavailable')
    }
  })
  await expect(actions['export-jpeg']()).rejects.toThrow('Destination is unavailable')
})
