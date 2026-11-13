import { expect, mock, test } from 'bun:test'

import { createAttachmentDrafts } from '@/components/chat/input/attachment-drafts'

test('taking and restoring a text draft preserves exact files without duplicating context', async () => {
  const report = mock(() => undefined)
  const drafts = createAttachmentDrafts(report)
  await drafts.addFiles([new File(['first'], 'first.txt')])
  const taken = drafts.take()
  expect(drafts.textFiles.value).toHaveLength(0)
  await drafts.addFiles([new File(['second'], 'second.ts')])
  drafts.restore({ ...taken, modelText: 'Inspect', displayText: 'Inspect', nodes: [] })
  expect(drafts.textFiles.value.map((entry) => entry.text)).toEqual(['first', 'second'])
  drafts.removeTextFile(0)
  expect(drafts.take().files.map((entry) => entry.file.name)).toEqual(['second.ts'])
  expect(drafts.take().files).toEqual([])
  expect(report).not.toHaveBeenCalled()
})

test('a late file read cannot enter a cleared or newer draft', async () => {
  let finish: (bytes: ArrayBuffer) => void = () => {
    throw new Error('Read not started')
  }
  class DelayedText extends File {
    override arrayBuffer(): Promise<ArrayBuffer> {
      return new Promise((resolve) => {
        finish = resolve
      })
    }
  }
  const drafts = createAttachmentDrafts(mock(() => undefined))
  const pending = drafts.addFiles([new DelayedText(['old'], 'old.txt')])
  expect(drafts.preparing.value).toBe(true)
  drafts.clear()
  await drafts.addFiles([new File(['current'], 'current.txt')])
  finish(new TextEncoder().encode('old').buffer)
  await pending
  expect(drafts.preparing.value).toBe(false)
  expect(drafts.take().files.map((entry) => entry.text)).toEqual(['current'])
})

test('a refused file does not remove a valid attachment or the pending state', async () => {
  const report = mock(() => undefined)
  const drafts = createAttachmentDrafts(report)
  await drafts.addFiles([new File(['valid'], 'valid.md'), new File(['binary'], 'bad.pdf')])
  expect(drafts.textFiles.value.map((entry) => entry.text)).toEqual(['valid'])
  expect(report).toHaveBeenCalledTimes(1)
  expect(drafts.preparing.value).toBe(false)
  drafts.clear()
  expect(drafts.textFiles.value).toEqual([])
})
