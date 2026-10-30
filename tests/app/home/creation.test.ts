import { afterEach, expect, spyOn, test } from 'bun:test'

import type { ChatSubmission } from '@/app/ai/chat/submission/types'
import type { EditorStore } from '@/app/editor/active-store'
import {
  consumeHomeBrowserRequest,
  createHomeBrowserDesign,
  createHomeDesign,
  homeCreation,
  takeHomeCreation
} from '@/app/home/creation'
import * as tabs from '@/app/tabs'

import { asDouble } from '#tests/helpers/doubles'

let restore: (() => void) | undefined
afterEach(() => {
  restore?.()
  homeCreation.value = null
})

function nextDocument() {
  const editor = asDouble<EditorStore>({})
  const create = spyOn(tabs, 'createTab').mockReturnValue({
    id: 'new',
    kind: 'document',
    store: editor
  })
  restore = () => create.mockRestore()
  return { editor, create }
}

test('Home draft preserves attachments and model context for only its target document once', () => {
  const { editor, create } = nextDocument()
  const submission: ChatSubmission = {
    displayText: 'Keep this reference',
    modelText: 'Make a mobile layout. Keep this reference',
    images: [
      {
        file: new File(['pixels'], 'reference.png', { type: 'image/png' }),
        previewURL: 'blob:reference'
      }
    ],
    nodes: []
  }
  createHomeDesign(submission)
  expect(create).toHaveBeenCalledTimes(1)
  expect(takeHomeCreation(asDouble<EditorStore>({}))).toBeNull()
  expect(takeHomeCreation(editor)).toBe(submission)
  expect(takeHomeCreation(editor)).toBeNull()
})

test('browser launch belongs to its new document and is consumed once', () => {
  const { editor, create } = nextDocument()
  createHomeBrowserDesign()
  expect(create).toHaveBeenCalledTimes(1)
  expect(consumeHomeBrowserRequest(asDouble<EditorStore>({}))).toBe(false)
  expect(consumeHomeBrowserRequest(editor)).toBe(true)
  expect(consumeHomeBrowserRequest(editor)).toBe(false)
})
