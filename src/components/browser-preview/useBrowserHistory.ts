import { onScopeDispose, ref } from 'vue'

import type { BrowserPreviewSession } from '@/app/browser-preview/context'
import type { createBrowserPreviewController } from '@/app/browser-preview/controller'
import { completedBrowserVisitSchema } from '@/app/browser-preview/history/schema'
import { browserHistoryError, rememberBrowserVisit } from '@/app/browser-preview/history/storage'
import { authorizeBrowserExport } from '@/app/browser-preview/native'
import { bindDesktopLinkQueue } from '@/app/tauri/link-queue'

export function useBrowserHistory(options: {
  session: BrowserPreviewSession
  preview: ReturnType<typeof createBrowserPreviewController>
  isCurrent: () => boolean
  busy: () => boolean
}) {
  const openingHistory = ref(false)
  let disposed = false
  const connection = bindDesktopLinkQueue({
    event: 'browser-preview:page-loaded',
    command: 'take_browser_preview_visits',
    schema: completedBrowserVisitSchema,
    label: 'Browser history',
    open: rememberBrowserVisit
  }).catch(() => {
    browserHistoryError.value =
      'Browsing history could not be connected. Reopen the browser to try again.'
    return () => undefined
  })
  async function openSuggestion(input: string) {
    if (options.busy()) return
    openingHistory.value = true
    try {
      const url = input.startsWith('file:') ? await authorizeBrowserExport(input) : input
      if (disposed || !options.isCurrent()) return
      if (url.startsWith('file:')) options.session.exportURLs.add(url)
      options.preview.address.value = url
      if (url.trim()) await options.preview.navigate()
    } catch (reason) {
      if (!disposed)
        options.preview.error.value = reason instanceof Error ? reason.message : String(reason)
    } finally {
      openingHistory.value = false
    }
  }
  onScopeDispose(() => {
    disposed = true
    void connection.then((stop) => stop())
  })
  return { openingHistory, openSuggestion }
}
