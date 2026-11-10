import * as v from 'valibot'

import { invokeNative } from '#tests/helpers/tauri/invoke'

const labelsSchema = v.array(v.string())
const statesSchema = v.array(v.object({ label: v.string() }))

function validated<T>(schema: v.GenericSchema<unknown, T>, value: unknown): T {
  const parsed = v.safeParse(schema, value)
  if (!parsed.success) throw new Error('Invalid native companion response')
  return parsed.output
}

export async function observeNativeDriverCompanion() {
  const windows = validated(labelsSchema, await invokeNative('plugin:wdio|list_windows'))
  const states = validated(statesSchema, await invokeNative('plugin:wdio|get_window_states'))
  const label = validated(v.string(), await invokeNative('plugin:wdio|get_active_window_label'))
  const request = {
    script: 'document.querySelector("canvas") !== null',
    args: [],
    window_label: 'main'
  }
  const executed = validated(v.boolean(), await invokeNative('plugin:wdio|execute', { request }))
  const childRefusal = await invokeNative('plugin:wdio|execute', {
    request: { ...request, window_label: 'browser-preview' }
  }).then(() => '', String)
  return { windows, stateLabels: states.map((state) => state.label), label, executed, childRefusal }
}
