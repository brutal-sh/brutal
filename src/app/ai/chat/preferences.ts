import { computed } from 'vue'

import { resolveAgentStepLimit } from '@/app/ai/reply/step-limit'
import {
  appPreferences,
  type ChatTextSize,
  type ChangePreviewSize,
  type ReasoningDisplay
} from '@/app/settings/preferences/store'

export const maxAgentSteps = computed({
  get: () => resolveAgentStepLimit(appPreferences.value.chat.maxAgentSteps),
  set: (value: number) => {
    appPreferences.value = {
      ...appPreferences.value,
      chat: { ...appPreferences.value.chat, maxAgentSteps: resolveAgentStepLimit(value) }
    }
  }
})

export const reasoningDisplay = computed({
  get: () => appPreferences.value.chat.reasoningDisplay,
  set: (reasoningDisplay: ReasoningDisplay) => {
    appPreferences.value = {
      ...appPreferences.value,
      chat: { ...appPreferences.value.chat, reasoningDisplay }
    }
  }
})

export const changePreviewSize = computed({
  get: () => appPreferences.value.chat.changePreviewSize,
  set: (changePreviewSize: ChangePreviewSize) => {
    appPreferences.value = {
      ...appPreferences.value,
      chat: { ...appPreferences.value.chat, changePreviewSize }
    }
  }
})

export const chatTextSize = computed({
  get: () => appPreferences.value.chat.textSize,
  set: (textSize: ChatTextSize) => {
    appPreferences.value = {
      ...appPreferences.value,
      chat: { ...appPreferences.value.chat, textSize }
    }
  }
})

const CHAT_TEXT_SCALES: Record<ChatTextSize, number> = { small: 1, medium: 1.075, large: 1.15 }
export const chatTextScale = computed(() => CHAT_TEXT_SCALES[chatTextSize.value])
