import { strict as assert } from 'node:assert'

import { invokeNative } from '#tests/helpers/tauri/invoke'

import {
  closeNativeDriverWindow,
  readClosedNativeDriverError,
  readNativeDriverHandle,
  readNativeDriverHandles,
  switchNativeDriverWindow
} from './protocol'

const AUXILIARY_LABEL = 'native-driver-aux'

async function cleanupAuxiliaryWindow(destroy: boolean): Promise<unknown[]> {
  const failures: unknown[] = []
  try {
    await switchNativeDriverWindow('main')
  } catch (error) {
    failures.push(error)
  }
  if (destroy) {
    try {
      await invokeNative('plugin:window|destroy', { label: AUXILIARY_LABEL })
    } catch (error) {
      failures.push(error)
    }
  }
  return failures
}

export async function observeNativeDriverWindowClose() {
  assert.ok(!(await readNativeDriverHandles()).includes(AUXILIARY_LABEL))
  let created = false
  let closed = false
  let before: string[] = []
  let after: string[] = []
  let staleError = ''
  const failures: unknown[] = []
  try {
    await invokeNative('plugin:webview|create_webview_window', {
      options: {
        label: AUXILIARY_LABEL,
        url: 'about:blank',
        visible: false,
        incognito: true,
        width: 320,
        height: 240
      }
    })
    created = true
    before = await readNativeDriverHandles()
    await switchNativeDriverWindow(AUXILIARY_LABEL)
    await closeNativeDriverWindow()
    await browser.waitUntil(
      async () => !(await readNativeDriverHandles()).includes(AUXILIARY_LABEL)
    )
    closed = true
    after = await readNativeDriverHandles()
    staleError = await readClosedNativeDriverError()
  } catch (error) {
    failures.push(error)
  } finally {
    failures.push(...(await cleanupAuxiliaryWindow(created && !closed)))
  }
  if (failures.length === 1) throw failures[0]
  if (failures.length > 1)
    throw new AggregateError(failures, 'Native window operation and cleanup failed')
  return { before, after, staleError, current: await readNativeDriverHandle() }
}
