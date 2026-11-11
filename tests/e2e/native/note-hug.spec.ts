import { strict as assert } from 'node:assert'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { parsePenDocument } from '@open-pencil/pen'

import { testPath } from '#tests/helpers/paths'
import { createNativeLayerFixture } from '#tests/helpers/tauri/editor-snapshot'

async function geometry() {
  return browser.execute(() => {
    const store = window.openPencil?.getStore?.()
    return ['hug', 'gold', 'purple'].map((id) => {
      const node = store?.graph.getNode(id)
      return { id, y: node?.y, width: node?.width, height: node?.height }
    })
  })
}

async function reopenRecent(path: string) {
  await $('[data-test-id="tabbar-close"][data-active]').click()
  await $('[role="tab"][aria-label="Home"]').click()
  const recent = await $(
    '//button[.//span[@data-slot="name" and contains(text(), "Native Note Hug")]]'
  )
  await recent.waitForDisplayed()
  await recent.click()
  await browser.waitUntil(() =>
    browser.execute((file) => window.openPencil?.getStore?.().getDocumentFilePath() === file, path)
  )
}

it('retains Hug fallback and intrinsic Note overflow through native Save and Recents reopening', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'openpen-note-hug-'))
  const path = join(directory, 'Native Note Hug.pen')
  try {
    await createNativeLayerFixture()
    const data = await readFile(testPath('fixtures/pen-note-hug.pen'), 'utf8')
    await browser.execute((text) => {
      const transfer = new DataTransfer()
      transfer.items.add(new File([text], 'Note Hug.pen', { type: 'application/json' }))
      window.dispatchEvent(new DragEvent('drop', { dataTransfer: transfer, cancelable: true }))
    }, data)
    await browser.waitUntil(async () => (await geometry())[0].height === 500)
    const expected = [
      { id: 'hug', y: 0, width: 600, height: 500 },
      { id: 'gold', y: 20, width: 560, height: 356 },
      { id: 'purple', y: 376, width: 560, height: 219 }
    ]
    assert.deepEqual(await geometry(), expected)
    assert.equal(
      await browser.execute(
        async (file) => window.openPencil?.getStore?.().saveFigFileToPath(file),
        path
      ),
      true
    )
    const saved = parsePenDocument(await readFile(path, 'utf8')).children[0]
    assert.equal(saved.height, 'fit_content(500)')
    assert.deepEqual(
      saved.children?.map((node) => [node.width, node.height]),
      [
        ['fill_container', 'fill_container'],
        ['fill_container', 'fill_container']
      ]
    )
    await reopenRecent(path)
    assert.deepEqual(await geometry(), expected)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
