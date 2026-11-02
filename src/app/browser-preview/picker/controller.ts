import { shallowRef, ref } from 'vue'

import type { BrowserPickerAction, BrowserPickerState } from './schema'

export type BrowserPickerNative = (
  url: string,
  action: BrowserPickerAction,
  index?: number
) => Promise<BrowserPickerState>

export function createBrowserPickerController(
  native: BrowserPickerNative,
  url: () => string,
  busy: () => boolean,
  perform: (action: 'import' | 'capture') => void
) {
  const state = shallowRef<BrowserPickerState | null>(null)
  const error = ref('')
  const pending = ref(false)
  let revision = 0
  let requests = 0
  let disposed = false
  function reset() {
    revision++
    state.value = null
    error.value = ''
  }
  async function update(action: BrowserPickerAction, index?: number) {
    const target = url()
    if (disposed || !target || busy() || (action === 'read' && pending.value)) return
    const started = ++revision
    requests++
    pending.value = true
    if (action !== 'read') error.value = ''
    try {
      const result = await native(target, action, index)
      if (disposed || target !== url() || started !== revision) return
      error.value = ''
      state.value = result
      if (result.action) perform(result.action)
    } catch {
      if (!disposed && target === url() && started === revision)
        error.value = 'The element selection could not be updated. Try selecting it again.'
    } finally {
      pending.value = --requests > 0
    }
  }
  return {
    state,
    error,
    pending,
    reset,
    start: () => update('start'),
    stop: () => update('stop'),
    select: (index: number) => update('select', index),
    refresh: () => update('read'),
    dispose() {
      disposed = true
      reset()
      if (url()) void native(url(), 'stop').catch(() => undefined)
    }
  }
}
