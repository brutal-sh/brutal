<script setup lang="ts">
import { useStore } from '@nanostores/vue'
import { computed, ref, shallowRef, watch } from 'vue'

import { filesMessages, menuMessages } from '@open-pencil/vue/i18n'

import { type EditorStore, useActiveEditorStoreRef } from '@/app/editor/active-store'
import AppButton from '@/components/ui/button/AppButton.vue'
import AppAlertDialogRoot from '@/components/ui/dialog/AppAlertDialogRoot.vue'
import AppDialogBody from '@/components/ui/dialog/AppDialogBody.vue'
import AppDialogFooter from '@/components/ui/dialog/AppDialogFooter.vue'
import AppDialogHeader from '@/components/ui/dialog/AppDialogHeader.vue'
import AppAlert from '@/components/ui/feedback/AppAlert.vue'
import { useHeldContent } from '@/components/ui/overlay/held'
import { documentCloseUI } from '@/theme/document/close'

const active = useActiveEditorStoreRef()
const files = useStore(filesMessages)
const menu = useStore(menuMessages)
const saving = ref(false)
const savingOwner = shallowRef<EditorStore | null>(null)
const failed = ref(false)
const reloadFailed = computed(() => active.value?.lastReloadFailed.value ?? false)
const open = computed(
  () =>
    (active.value?.externalFileChange.value ?? false) ||
    (saving.value && savingOwner.value === active.value)
)
const documentName = useHeldContent(
  () => active.value?.state.documentName ?? '',
  () => open.value && !saving.value
)

watch(active, () => {
  failed.value = false
})

watch(open, (visible) => {
  if (!visible) failed.value = false
})

function ignore() {
  if (!saving.value) active.value?.ignoreExternalFileChange()
}

function reload() {
  failed.value = false
  return active.value?.reloadExternalFileChange()
}

async function saveCopy() {
  const owner = active.value
  if (!owner || saving.value) return
  savingOwner.value = owner
  saving.value = true
  failed.value = false
  try {
    if (await owner.saveFigFileAs()) owner.ignoreExternalFileChange()
    else if (active.value === owner) failed.value = owner.lastSaveFailed.value
  } finally {
    saving.value = false
    savingOwner.value = null
  }
}
</script>

<template>
  <AppAlertDialogRoot :open="open" @update:open="(visible) => !visible && ignore()">
    <AppDialogHeader
      :heading="files.fileChanged"
      :description="files.fileChangedDescription({ name: documentName })"
      :show-close="false"
      :ui="documentCloseUI"
    />
    <AppDialogBody v-if="failed || reloadFailed">
      <AppAlert
        tone="error"
        :heading="failed ? files.externalCopyFailed : files.externalReloadFailed"
        :description="files.externalCopyFailedDescription"
      />
    </AppDialogBody>
    <AppDialogFooter :ui="documentCloseUI">
      <AppButton color="neutral" variant="ghost" class="mr-auto" :disabled="saving" @click="ignore">
        {{ files.ignoreExternalChange }}
      </AppButton>
      <AppButton color="neutral" variant="outline" :disabled="saving" @click="reload">
        {{ files.reloadExternalChange }}
      </AppButton>
      <AppButton color="primary" :loading="saving" :disabled="saving" @click="saveCopy">
        {{ menu.saveAs }}
      </AppButton>
    </AppDialogFooter>
  </AppAlertDialogRoot>
</template>
