import { NativeSavePermissionError } from '@/app/document/io/save/local'
import { notificationMessages } from '@/app/i18n/notifications'
import { toast } from '@/app/shell/ui'

export function createSourceSaveFeedback() {
  const permissionFailure = shallowRef<string | null>(null)

  async function show(error: unknown) {
    const messages = notificationMessages.get()
    if (error instanceof NativeSavePermissionError) {
      const description = messages.nativeSavePermissionDenied
      try {
        const { message } = await import('@tauri-apps/plugin-dialog')
        await message(description, {
          title: messages.nativeSaveFailed({ name: error.fileName }),
          kind: 'error',
          buttons: 'Ok'
        })
      } catch {
        permissionFailure.value = error.fileName
      }
      return
    }
    toast.error(
      messages.operationFailed({ error: error instanceof Error ? error.message : String(error) })
    )
  }

  return {
    permissionFailure,
    show,
    clear: () => {
      permissionFailure.value = null
    }
  }
}
import { shallowRef } from 'vue'
