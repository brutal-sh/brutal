<script setup lang="ts">
import { useStore } from '@nanostores/vue'
import { useFocus } from '@vueuse/core'
import { computed, useTemplateRef } from 'vue'

import { commonMessages } from '@open-pencil/vue/i18n'

import { useActiveEditorStoreRef } from '@/app/editor/active-store'
import { useNotificationMessages } from '@/app/i18n/notifications'
import AppButton from '@/components/ui/button/AppButton.vue'
import AppAlertDialogRoot from '@/components/ui/dialog/AppAlertDialogRoot.vue'
import AppDialogFooter from '@/components/ui/dialog/AppDialogFooter.vue'
import AppDialogHeader from '@/components/ui/dialog/AppDialogHeader.vue'
import { useHeldContent } from '@/components/ui/overlay/held'
import { documentCloseUI } from '@/theme/document/close'

const active = useActiveEditorStoreRef()
const messages = useNotificationMessages()
const common = useStore(commonMessages)
const open = computed(() => Boolean(active.value?.savePermissionFailure.value))
const name = useHeldContent(() => active.value?.savePermissionFailure.value ?? null)
const confirmButton = useTemplateRef('confirmButton')
useFocus(confirmButton, { initialValue: true, preventScroll: true })

function dismiss() {
  active.value?.dismissSavePermissionFailure()
}
</script>

<template>
  <AppAlertDialogRoot :open="open" @update:open="(visible) => !visible && dismiss()">
    <AppDialogHeader
      :heading="messages.nativeSaveFailed({ name: name ?? '' })"
      :description="messages.nativeSavePermissionDenied"
      :show-close="false"
      :ui="documentCloseUI"
    />
    <AppDialogFooter :ui="documentCloseUI">
      <AppButton ref="confirmButton" color="primary" @click="dismiss">{{ common.ok }}</AppButton>
    </AppDialogFooter>
  </AppAlertDialogRoot>
</template>
