import { useIntervalFn } from '@vueuse/core'
import { inject, onScopeDispose, provide, watch, type InjectionKey } from 'vue'

import {
  createBrowserPickerController,
  type BrowserPickerNative
} from '@/app/browser-preview/picker/controller'

const key: InjectionKey<ReturnType<typeof createBrowserPickerController>> = Symbol('browser-picker')

export function provideBrowserPicker(
  native: BrowserPickerNative,
  url: () => string,
  busy: () => boolean,
  perform: (action: 'import' | 'capture') => void
) {
  const picker = createBrowserPickerController(native, url, busy, perform)
  const { pause, resume } = useIntervalFn(
    () => {
      void picker.refresh()
    },
    150,
    { immediate: false }
  )
  watch(url, picker.reset)
  watch(
    () => !!(picker.state.value?.picking || picker.state.value?.pick),
    (active) => (active ? resume() : pause())
  )
  onScopeDispose(() => picker.dispose())
  provide(key, picker)
  return picker
}

export function useBrowserPicker() {
  const picker = inject(key)
  if (!picker) throw new Error('Browser picker controls need their owning dock.')
  return picker
}
