<script setup lang="ts">
import { computed } from 'vue'

import { AI_PROVIDERS, IS_TAURI } from '@open-pencil/core/constants'
import { useI18n } from '@open-pencil/vue/i18n'

import {
  aiModelSettings,
  designModelProfile,
  designModelProfiles,
  isAgentModelProfile,
  modelConnection,
  modelProfile,
  type AIModelProfileId
} from '@/app/ai/models'
import { modelProviderName } from '@/app/ai/models/provider-name'
import { openSettingsDialog } from '@/app/settings/dialog'
import AppButton from '@/components/ui/button/AppButton.vue'
import AppPicker from '@/components/ui/select/AppPicker.vue'

import { chatProfileTheme } from './ui'

const {
  disabled = false,
  compact = false,
  agent = false
} = defineProps<{ disabled?: boolean; compact?: boolean; agent?: boolean }>()
const emit = defineEmits<{ select: [id: AIModelProfileId] }>()
const { ai, common } = useI18n()
const ui = chatProfileTheme()

const profiles = computed(() =>
  designModelProfiles().map((profile) => {
    const connection = modelConnection(profile.connectionId)
    const provider = AI_PROVIDERS.find((candidate) => candidate.id === connection?.providerID)
    const modelID = profile.customModelID || profile.modelID
    const modelName = provider?.models.find((model) => model.id === modelID)?.name ?? modelID
    return {
      value: profile.id,
      label: profile.name,
      description: modelName === profile.name ? undefined : modelName,
      group: connection ? modelProviderName(connection.providerID) : undefined,
      disabled: !connection || (!IS_TAURI && isAgentModelProfile(profile))
    }
  })
)

function select(id: string) {
  const profile = modelProfile(id)
  if (
    !disabled &&
    profile &&
    profiles.value.some((option) => option.value === id && !option.disabled)
  ) {
    emit('select', profile.id)
  }
}

function manageModels(close: () => void) {
  close()
  openSettingsDialog('ai')
}
</script>

<template>
  <AppPicker
    :heading="ai.modelRoleDesign"
    :items="profiles"
    :selected="aiModelSettings.assignments.design"
    :search-placeholder="ai.searchModels"
    :empty-label="common.noResults"
    :close-label="common.close"
    side="top"
    align="end"
    @select="select"
  >
    <template #trigger>
      <button
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        data-slot="chat-profile-trigger"
        data-test-id="chat-profile-selector"
        :aria-label="ai.selectDesignModel"
        :disabled="disabled"
        :class="ui.trigger()"
      >
        <icon-lucide-rocket v-if="compact && agent" class="size-[15px]" aria-hidden="true" />
        <icon-lucide-bot v-else-if="!compact" :class="ui.triggerIcon()" aria-hidden="true" />
        <span :class="ui.triggerValue()">{{
          designModelProfile?.name ?? ai.selectDesignModel
        }}</span>
        <icon-lucide-chevron-down :class="ui.triggerChevron()" aria-hidden="true" />
      </button>
    </template>
    <template #trailing="{ item }">
      <icon-lucide-eye
        v-if="modelProfile(item.value)?.capabilities.includes('vision')"
        :aria-label="ai.modelCapabilityVision"
        :class="ui.capability()"
        role="img"
      />
    </template>
    <template #footer="{ close }">
      <AppButton class="w-full justify-start" @click="manageModels(close)">
        <template #leading><icon-lucide-settings :class="ui.footerIcon()" /></template>
        {{ ai.manageModelsAndRoles }}
      </AppButton>
    </template>
  </AppPicker>
</template>
