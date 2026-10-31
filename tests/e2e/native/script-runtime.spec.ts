import { strict as assert } from 'node:assert'
import { mkdir, mkdtemp, readFile, realpath, rename, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { createNativeLayerFixture } from '#tests/helpers/tauri/editor-snapshot'

describe('native Script source persistence', () => {
  it('saves an initially linked source, closes/reopens, and watches ordinary and atomic changes', async () => {
    const directory = await realpath(await mkdtemp(join(tmpdir(), 'openpen-script-reopen-')))
    const sourcePath = join(directory, 'probe.js')
    const documentPath = join(directory, 'Native script reopen.pen')
    const source = `/** @schema 2.21\n * @input count: number = 3\n */
return Array.from({length:pencil.input.count},(_,index)=>({type:'rectangle',name:'Native '+index,x:index*40,width:30,height:170,fill:'#34A878'}));`
    try {
      await writeFile(sourcePath, source)
      await createNativeLayerFixture()
      const id = await browser.execute(
        ({ path }) => {
          const store = window.openPencil?.getStore?.()
          if (!store) throw new Error('Native editor unavailable')
          for (const node of store.graph.getChildren(store.state.currentPageId))
            store.graph.deleteNode(node.id)
          const id = store.createScript(440, 220)
          store.select([id])
          store.attachScriptSource(id, path)
          return id
        },
        { path: sourcePath }
      )
      const children = () =>
        browser.execute((id) => {
          const store = window.openPencil?.getStore?.()
          return store?.graph
            .getChildren(id)
            .map((node) => ({ width: node.width, height: node.height }))
        }, id)
      await browser.waitUntil(async () => (await children())?.length === 3)
      assert.equal(
        await browser.execute(
          async (path) => window.openPencil?.getStore?.().saveFigFileToPath(path),
          documentPath
        ),
        true
      )
      assert.ok((await readFile(documentPath, 'utf8')).includes('probe.js'))
      async function reopen(name: string, path: string) {
        await $('[data-test-id="tabbar-close"][data-active]').click()
        await $('[role="tab"][aria-label="Home"]').click()
        const recent = await $(
          `//button[.//span[@data-slot="name" and contains(text(), "${name}")]]`
        )
        await recent.waitForDisplayed()
        await recent.click()
        await browser.waitUntil(async () =>
          browser.execute(
            (path) => window.openPencil?.getStore?.().getDocumentFilePath() === path,
            path
          )
        )
      }
      await reopen('Native script reopen', documentPath)
      await browser.waitUntil(async () => (await children())?.length === 3, {
        timeout: 10_000,
        timeoutMsg: 'Reopened Script did not resolve its document-local source'
      })
      await writeFile(sourcePath, source.replace('height:170', 'height:150'))
      await browser.waitUntil(async () => (await children())?.[0]?.height === 150)
      const replacement = join(directory, 'replacement.js')
      await writeFile(replacement, source.replace('height:170', 'height:140'))
      await rename(replacement, sourcePath)
      await browser.waitUntil(async () => (await children())?.[0]?.height === 140)
      assert.equal(
        await browser.execute(() => window.openPencil?.getStore?.().hasUnsavedChanges()),
        false
      )
      console.log('NATIVE_SCRIPT_SAVE_REOPEN_WATCH_ACCEPTED')
      const nested = join(directory, 'nested')
      await mkdir(nested)
      const outsideDocument = join(nested, 'Outside source.pen')
      assert.equal(
        await browser.execute(
          async (path) => window.openPencil?.getStore?.().saveFigFileToPath(path),
          outsideDocument
        ),
        true
      )
      await reopen('Outside source', outsideDocument)
      await browser.execute((id) => window.openPencil?.getStore?.().select([id]), id)
      const error = await $('[role="alert"]')
      await error.waitForDisplayed()
      assert.ok((await error.getText()).includes('Script file could not be read'))
      assert.equal(await $('button=Convert to layers').isEnabled(), false)
      console.log('NATIVE_SCRIPT_OUTSIDE_FOLDER_REFUSAL_ACCEPTED')
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })
})
