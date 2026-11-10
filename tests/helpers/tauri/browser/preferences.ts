import type { PreviewPreset } from '@/app/browser-preview/schema'

import { reloadNativeEditor } from '#tests/helpers/tauri/navigation'

/** Give this isolated workflow a known viewport without resetting its later persistence checks. */
export async function prepareNativeBrowserViewport(
  preset: PreviewPreset['value'] = 'desktop'
): Promise<void> {
  await browser.execute((preset) => {
    // The incognito native fixture owns only this viewport preference key.
    // oxlint-disable-next-line open-pencil/no-direct-storage-access
    localStorage.setItem(
      'open-pen:browser-viewport',
      JSON.stringify({ preset, zoom: 0.5, responsiveZoom: 0.5 })
    )
  }, preset)
  await reloadNativeEditor()
}
