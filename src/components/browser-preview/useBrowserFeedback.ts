import { watch, type Ref } from 'vue'

import { toast } from '@/app/shell/ui'

interface FeedbackOptions {
  error: () => string
  notice: Ref<string>
  captureAvailable: () => boolean | undefined
}

export function useBrowserFeedback(options: FeedbackOptions) {
  watch(
    options.error,
    (message) => {
      if (message) toast.error(message)
    },
    { immediate: true }
  )
  watch(options.notice, (message) => {
    if (message) toast.info(message)
  })
  watch(options.captureAvailable, (available) => {
    if (available === false) toast.info('Capture requires macOS.')
  })
}
