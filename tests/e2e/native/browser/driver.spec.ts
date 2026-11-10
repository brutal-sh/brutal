import { strict as assert } from 'node:assert'

import { observeNativeDriverChild } from '#tests/helpers/tauri/driver/child'
import { readNativeDriverHandles } from '#tests/helpers/tauri/driver/protocol'
import { observeNativeDriverWindowClose } from '#tests/helpers/tauri/driver/window'

it('retains the primary driver and companion context while a browser child is loaded', async () => {
  const result = await observeNativeDriverChild()
  assert.deepEqual(result.before, ['main'])
  assert.deepEqual(result.during, ['main'])
  assert.equal(result.enabled, true)
  assert.equal(result.childError, 'no such window')
  assert.equal(result.missingError, 'no such window')
  assert.deepEqual(result.companion.windows, ['main'])
  assert.deepEqual(result.companion.stateLabels, ['main'])
  assert.equal(result.companion.label, 'main')
  assert.equal(result.companion.executed, true)
  assert.ok(
    result.companion.childRefusal.includes('browser-preview') &&
      result.companion.childRefusal.includes('not found')
  )
  assert.deepEqual(await readNativeDriverHandles(), ['main'])
})

it('refuses a destroyed window context until the primary window is explicitly selected', async () => {
  const result = await observeNativeDriverWindowClose()
  assert.ok(result.before.includes('native-driver-aux'))
  assert.ok(!result.after.includes('native-driver-aux'))
  assert.ok(result.after.includes('main'))
  assert.equal(result.staleError, 'no such window')
  assert.equal(result.current, 'main')
})
