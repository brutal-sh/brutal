import { message } from '@tauri-apps/plugin-dialog'

import type { NativeMessageDialog } from '@/app/document/close/native'

export async function confirmBrowserSiteClear(url: string, show: NativeMessageDialog = message) {
  const target = new URL(url)
  if (target.protocol === 'file:') return true
  const origin = target.origin
  return (
    (await show('Remove this site’s cookies, storage and caches, then reload the page.', {
      title: `Clear website data for ${origin}?`,
      kind: 'warning',
      buttons: { ok: 'Clear Data', cancel: 'Cancel' }
    })) === 'Clear Data'
  )
}
