import { colorToHex } from '@open-pencil/scene-graph/color'
import { panelMessages } from '@open-pencil/vue/i18n'

import { createTextClipboard } from '@/app/editor/clipboard/text'
import { notificationMessages } from '@/app/i18n/notifications'
import { toast } from '@/app/shell/ui'

import { sampleScreenColor } from './index'

export function createCopyScreenColor() {
  const copyText = createTextClipboard()
  let pending = false

  return async function copyScreenColor() {
    if (pending) return
    pending = true
    try {
      const sample = await sampleScreenColor()
      if (sample) {
        const hex = colorToHex(sample)
        await copyText(hex, hex).catch(() => {
          toast.error(notificationMessages.get().clipboardAccessBlocked)
        })
      }
    } catch {
      toast.error(panelMessages.get().sampleScreenColorFailed)
    } finally {
      pending = false
    }
  }
}
