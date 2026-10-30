<script setup lang="ts">
import { tv } from 'tailwind-variants'
import { computed, ref, useId, useTemplateRef } from 'vue'

import { useAIChat } from '@/app/ai/chat/use'
import { designModelProfile } from '@/app/ai/models'
import { useEditorStore } from '@/app/editor/active-store'
import { createHomeBrowserDesign, createHomeDesign, homeCreation } from '@/app/home/creation'
import { openSettingsDialog } from '@/app/settings/dialog'
import { openFileDialog } from '@/app/shell/menu/use'
import { isTauri } from '@/app/tauri/env'
import ChatProfileSelect from '@/components/chat/ChatProfileSelect.vue'
import ChatThinkingSelect from '@/components/chat/ChatThinkingSelect.vue'
import { useAttachmentDrafts } from '@/components/chat/input/useAttachments'
import AppButton from '@/components/ui/button/AppButton.vue'
import IconButton from '@/components/ui/button/IconButton.vue'
import AppAlert from '@/components/ui/feedback/AppAlert.vue'
import heroTheme from '@/theme/home/hero'

const styles = tv(heroTheme)()
const category = ref('Landing page')
const dismissed = ref(false)
const categories = [
  'Landing page',
  'Mobile app',
  'Web app',
  'Slides',
  'Dashboard',
  'Something else…'
]
const prompt = ref('')
const error = ref('')
const input = useTemplateRef<HTMLTextAreaElement>('input')
const inputId = useId()
const editor = useEditorStore()
const { isConfigured, providerDef, modelID, providerID } = useAIChat()
const modelName = computed(
  () =>
    designModelProfile.value?.name ??
    providerDef.value.models.find((model) => model.id === modelID.value)?.name ??
    'Choose model'
)
const native = isTauri()
const { images, openImageDialog, removeImage, handlePaste, takeSubmission } = useAttachmentDrafts({
  editor,
  selectedIds: computed(() => new Set<string>()),
  reportError: (message) => {
    error.value = message
  }
})
function chooseCategory(value: string) {
  category.value = value
  input.value?.focus()
}
function submit() {
  if (!prompt.value.trim() || homeCreation.value) return
  if (!isConfigured.value) {
    openSettingsDialog('ai')
    return
  }
  const submission = takeSubmission(prompt.value.trim())
  if (category.value !== 'Something else…')
    submission.modelText = `Create a ${category.value.toLowerCase()}. ${submission.modelText}`
  createHomeDesign(submission)
  prompt.value = ''
}
function screenshot() {
  if (!prompt.value.trim()) prompt.value = 'Recreate this screenshot as editable layers.'
  openImageDialog()
}
</script>

<template>
  <section aria-label="Create a design" :class="styles.root()">
    <AppButton
      v-if="dismissed"
      aria-label="Show design composer"
      variant="outline"
      @click="dismissed = false"
      ><template #leading><icon-lucide-plus class="size-4" /></template>New design</AppButton
    >
    <div v-show="!dismissed">
      <IconButton label="Dismiss" :class="styles.dismiss()" @click="dismissed = true"
        ><icon-lucide-x class="size-4"
      /></IconButton>
      <div role="group" aria-label="Design type" :class="styles.categories()">
        <button
          v-for="item in categories"
          :key="item"
          type="button"
          :aria-pressed="category === item"
          :data-selected="category === item"
          :class="styles.category()"
          @click="chooseCategory(item)"
        >
          <icon-lucide-panels-top-left v-if="item === 'Landing page'" class="size-4" />
          <icon-lucide-smartphone v-else-if="item === 'Mobile app'" class="size-4" />
          <icon-lucide-app-window v-else-if="item === 'Web app'" class="size-4" />
          <icon-lucide-presentation v-else-if="item === 'Slides'" class="size-4" />
          <icon-lucide-layout-dashboard v-else-if="item === 'Dashboard'" class="size-4" />
          <icon-lucide-file-plus v-else class="size-4" />
          {{ item }}
        </button>
      </div>
      <div :class="styles.composerWrapper()">
        <div aria-hidden="true" :class="styles.glow()" />
        <form :class="styles.composer()" @submit.prevent="submit" @paste="handlePaste">
          <label :for="inputId" class="sr-only">Create anything</label>
          <textarea
            :id="inputId"
            ref="input"
            v-model="prompt"
            placeholder="Create anything…"
            rows="2"
            :class="styles.input()"
            @keydown.meta.enter.prevent="submit"
            @keydown.ctrl.enter.prevent="submit"
          />
          <div v-if="images.length" class="flex flex-wrap gap-2 px-4 pb-3">
            <div
              v-for="(image, index) in images"
              :key="image.previewURL"
              :class="styles.attachment()"
            >
              <img
                :src="image.previewURL"
                :alt="image.file.name"
                :class="styles.attachmentImage()"
              />
              <IconButton
                :label="`Remove ${image.file.name}`"
                size="sm"
                :class="styles.attachmentRemove()"
                @click="removeImage(index)"
                ><icon-lucide-x class="size-3"
              /></IconButton>
            </div>
          </div>
          <div :class="styles.footer()">
            <IconButton label="Add to context" @click="openImageDialog()"
              ><icon-lucide-plus class="size-4"
            /></IconButton>
            <span class="flex-1" />
            <ChatThinkingSelect v-if="!providerID.startsWith('acp:')" />
            <ChatProfileSelect
              ><template #value>{{ modelName }}</template></ChatProfileSelect
            >
            <IconButton
              label="Send message"
              type="submit"
              :disabled="!prompt.trim() || !!homeCreation"
              ><icon-lucide-arrow-up class="size-4"
            /></IconButton>
          </div>
        </form>
      </div>
      <AppAlert
        v-if="error"
        tone="error"
        heading="Could not add image"
        :description="error"
        class="mt-3"
      />
      <div :class="styles.imports()">
        <button type="button" :class="styles.import()" @click="openFileDialog">
          <icon-lucide-figma class="size-4" />Import from Figma
        </button>
        <button
          type="button"
          :class="styles.import()"
          :disabled="!native"
          :aria-description="native ? undefined : 'Available in the desktop app'"
          @click="createHomeBrowserDesign"
        >
          <icon-lucide-globe class="size-4" />Import from browser
        </button>
        <button type="button" :class="styles.import()" @click="screenshot">
          <icon-lucide-image-plus class="size-4" />Recreate a screenshot
        </button>
      </div>
    </div>
  </section>
</template>
