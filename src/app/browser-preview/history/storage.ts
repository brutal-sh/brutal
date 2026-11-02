import { invoke } from '@tauri-apps/api/core'
import { useEventListener } from '@vueuse/core'
import * as v from 'valibot'

import { browserHistoryGenerationSchema } from './schema'
import { createBrowserHistoryState } from './state'

const history = createBrowserHistoryState(
  () => localStorage,
  async (url) =>
    v.parse(browserHistoryGenerationSchema, await invoke('clear_browser_preview_visits', { url }))
)

useEventListener('storage', (event) => {
  if (event.key === 'open-pen:browser-history' || event.key === null) history.refresh()
})

export const {
  entries: browserHistory,
  error: browserHistoryError,
  pending: updatingBrowserHistory,
  remember: rememberBrowserVisit,
  remove: removeBrowserVisit,
  clear: clearBrowserHistory
} = history
