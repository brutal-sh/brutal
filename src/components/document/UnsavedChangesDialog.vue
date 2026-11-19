<script setup lang="ts">
import { useStore } from '@nanostores/vue'
import { useFocus } from '@vueuse/core'
import { useTemplateRef } from 'vue'

import { commonMessages, filesMessages, recoveryMessages } from '@open-pencil/vue/i18n'

import { answerClosePrompt, closePrompt } from '@/app/document/close/prompt'
import AppButton from '@/components/ui/button/AppButton.vue'
import AppAlertDialogRoot from '@/components/ui/dialog/AppAlertDialogRoot.vue'
import AppDialogFooter from '@/components/ui/dialog/AppDialogFooter.vue'
import AppDialogHeader from '@/components/ui/dialog/AppDialogHeader.vue'
import { useHeldContent } from '@/components/ui/overlay/held'
import { documentCloseUI, documentCloseButtonUI, recoveryCloseUI } from '@/theme/document/close'

const files = useStore(filesMessages)
const common = useStore(commonMessages)
const recovery = useStore(recoveryMessages)
const saveButton = useTemplateRef('saveButton')
const prompt = useHeldContent(closePrompt)

// The dialog mounts on open, so focusing the primary action when the target appears keeps
// Return on Save while Escape still cancels.
useFocus(saveButton, { initialValue: true, preventScroll: true })

function updateOpen(open: boolean) {
  if (!open) answerClosePrompt('cancel')
}
</script>

<template>
  <AppAlertDialogRoot
    :open="closePrompt !== null"
    :size="prompt?.canKeepBackup ? 'md' : 'sm'"
    @update:open="updateOpen"
  >
    <AppDialogHeader
      :heading="files.saveBeforeClosing({ name: prompt?.documentName ?? '' })"
      :description="
        prompt?.canKeepBackup ? recovery.closeDescription : files.saveBeforeClosingDescription
      "
      :show-close="false"
      :ui="documentCloseUI"
    />
    <AppDialogFooter :ui="prompt?.canKeepBackup ? recoveryCloseUI : documentCloseUI">
      <AppButton
        color="neutral"
        variant="ghost"
        class="mr-auto"
        @click="answerClosePrompt('discard')"
      >
        {{ prompt?.canKeepBackup ? recovery.discardBackup : files.discard }}
      </AppButton>
      <AppButton
        v-if="prompt?.canKeepBackup"
        color="neutral"
        variant="outline"
        @click="answerClosePrompt('keep-backup')"
      >
        {{ recovery.keepBackup }}
      </AppButton>
      <AppButton
        color="neutral"
        variant="outline"
        :ui="documentCloseButtonUI"
        @click="answerClosePrompt('cancel')"
      >
        {{ common.cancel }}
      </AppButton>
      <AppButton
        ref="saveButton"
        color="primary"
        variant="solid"
        :ui="documentCloseButtonUI"
        @click="answerClosePrompt('save')"
      >
        {{ common.save }}
      </AppButton>
    </AppDialogFooter>
  </AppAlertDialogRoot>
</template>
