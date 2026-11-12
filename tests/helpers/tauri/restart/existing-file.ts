import { strict as assert } from 'node:assert'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { BUILTIN_IO_FORMATS, IORegistry } from '@open-pencil/core/io'

import { readNativeRecoveryDigests } from './digests'
import { createNativeRecoveryRestart } from './session'

const design = JSON.stringify({
  version: '2.21',
  children: [
    {
      id: 'original',
      type: 'rectangle',
      name: 'Existing rectangle',
      width: 64,
      height: 64,
      fill: '#2563eb'
    }
  ]
})

async function visibleEditor(session: WebdriverIO.Browser) {
  await session.execute(async () => {
    const api = window.__TAURI__?.core
    if (!api) throw new Error('Missing isolated native API')
    await api.invoke('plugin:app|app_show')
    await api.invoke('plugin:window|set_focus', { label: 'main' })
  })
  await session.waitUntil(() => session.execute(() => !document.hidden))
}

async function expectNodes(session: WebdriverIO.Browser, count: number) {
  await session.waitUntil(
    () =>
      session.execute((expected) => {
        const store = window.openPencil?.getStore?.()
        return Boolean(
          store?.textEditor &&
          store.graph.getChildren(store.state.currentPageId).length === expected
        )
      }, count),
    { timeoutMsg: `Expected ${count} editable native layers` }
  )
}

async function editExisting(session: WebdriverIO.Browser) {
  await visibleEditor(session)
  await expectNodes(session, 1)
  await session
    .executeAsync(async (done) => {
      try {
        const store = window.openPencil?.getStore?.()
        if (!store) throw new Error('Missing native editor')
        if (store.state.autosaveEnabled) throw new Error('Fixture requires local file autosave off')
        store.createShape('RECTANGLE', 120, 120, 64, 64)
        await store.persistRecoveryNow()
        done(null)
      } catch (error) {
        done(String(error))
      }
    })
    .then((error) => assert.equal(error, null))
  await expectNodes(session, 2)
  const backup = await readNativeRecoveryDigests(session)
  assert.equal(backup.failure, undefined)
  assert.equal(backup.digests?.length, 1)
  return backup
}

async function restoreAndSave(
  session: WebdriverIO.Browser,
  path: string,
  backup: Awaited<ReturnType<typeof readNativeRecoveryDigests>>
) {
  await visibleEditor(session)
  const offer = session.$('[data-test-id="recovery-dialog"][data-state="open"]')
  await offer.waitForDisplayed()
  assert.deepEqual(await readNativeRecoveryDigests(session), backup)
  assert.equal(await readFile(path, 'utf8'), design)
  await offer.$('button=Restore').click()
  await expectNodes(session, 2)
  assert.equal(await readFile(path, 'utf8'), design)
  await session.keys(['Meta', 's'])
  await session.waitUntil(
    async () => {
      const result = await readNativeRecoveryDigests(session)
      assert.equal(result.failure, undefined)
      return result.digests?.length === 0
    },
    { timeoutMsg: 'Explicit native Save did not clear the backup' }
  )
  const reopened = await new IORegistry(BUILTIN_IO_FORMATS).readDocument({
    name: 'existing.pen',
    data: await readFile(path)
  })
  const rectangles = [...reopened.graph.nodes.values()].filter((node) => node.type === 'RECTANGLE')
  assert.equal(rectangles.length, 2)
  for (const rectangle of rectangles)
    assert.deepEqual([rectangle.width, rectangle.height], [64, 64])
}

export async function runNativeExistingFileRecovery(binary: string) {
  const profile = await createNativeRecoveryRestart(binary)
  const path = join(profile.owner.root, 'existing.pen')
  process.stderr.write(`Native recovery profile retained at ${profile.owner.root}\n`)
  try {
    await writeFile(path, design, { mode: 0o600, flag: 'wx' })
    const first = await profile.launch(path)
    const backup = await editExisting(first.session)
    assert.equal(await readFile(path, 'utf8'), design)
    const interrupted = await profile.crash()
    assert.equal(interrupted.pid, first.identity.pid)
    const second = await profile.launch()
    assert.notEqual(second.identity.pid, first.identity.pid)
    await restoreAndSave(second.session, path, backup)
    await profile.close()
    const third = await profile.launch(path)
    assert.equal(new Set([first.identity.pid, second.identity.pid, third.identity.pid]).size, 3)
    await verifyReopened(third.session)
    return {
      first: first.identity,
      interrupted,
      second: second.identity,
      third: third.identity,
      backup
    }
  } finally {
    await profile.dispose()
  }
}

async function verifyReopened(session: WebdriverIO.Browser) {
  await visibleEditor(session)
  await expectNodes(session, 2)
  await session.waitUntil(() =>
    session.execute(() => Boolean(window.openPencil?.test?.recoveryReady))
  )
  await session.executeAsync(async (done) => {
    await window.openPencil?.test?.recoveryReady
    done(undefined)
  })
  assert.equal(
    await session.$('[data-test-id="recovery-dialog"][data-state="open"]').isExisting(),
    false
  )
  assert.deepEqual(await readNativeRecoveryDigests(session), { digests: [] })
  await session.execute(() => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('Missing editable reopened document')
    const node = store.graph.getChildren(store.state.currentPageId)[0]
    if (!node) throw new Error('Missing reopened layer')
    store.select([node.id])
  })
  await session.keys(['Meta', 'd'])
  await expectNodes(session, 3)
  await session.keys(['Meta', 'z'])
  await expectNodes(session, 2)
}
