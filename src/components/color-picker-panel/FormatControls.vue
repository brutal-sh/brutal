<script setup lang="ts">
import { inputValue } from '@open-pencil/vue/shared/dom-events'

import { useColorPickerPanelContext } from '@/components/color-picker-panel/context'
import HsbFields from '@/components/color-picker-panel/HsbFields.vue'
import HslFields from '@/components/color-picker-panel/HslFields.vue'
import OkhclFields from '@/components/color-picker-panel/OkhclFields.vue'
import RGBFields from '@/components/color-picker-panel/RGBFields.vue'
import IconButton from '@/components/ui/button/IconButton.vue'
import AppAlert from '@/components/ui/feedback/AppAlert.vue'
import AppSelect from '@/components/ui/select/AppSelect.vue'

const ctx = useColorPickerPanelContext()
</script>

<template>
  <div class="flex flex-col gap-2">
    <div class="flex items-center gap-1.5">
      <IconButton
        v-if="ctx.compact"
        :label="
          ctx.canSampleScreenColor
            ? ctx.panels.sampleScreenColor
            : ctx.panels.sampleScreenColorUnavailable
        "
        class="rounded-md bg-input"
        :disabled="ctx.sampling || !ctx.canSampleScreenColor"
        :active="ctx.sampling"
        :aria-busy="ctx.sampling || undefined"
        @click="ctx.pickScreenColor"
      >
        <icon-lucide-pipette class="size-3.5" />
      </IconButton>
      <AppSelect
        :ui="{ trigger: ctx.compact ? 'w-20' : 'w-[120px]' }"
        data-test-id="color-format-select"
        :model-value="ctx.fieldFormat"
        :options="ctx.fieldOptions"
        @update:model-value="ctx.setFieldFormat"
      />
    </div>
    <AppAlert v-if="ctx.samplingError" tone="error" :heading="ctx.panels.sampleScreenColorFailed" />

    <div class="min-w-0 flex flex-col gap-2">
      <input
        v-if="ctx.fieldFormat === 'hex' || ctx.fieldFormat === 'css'"
        :key="ctx.fieldFormat"
        type="text"
        :aria-label="ctx.fieldFormat.toUpperCase()"
        :aria-invalid="ctx.textError || undefined"
        class="h-6 min-w-0 rounded border border-transparent bg-input px-2 text-xs text-surface outline-none aria-invalid:border-error"
        :value="ctx.fieldFormat === 'hex' ? ctx.hex : ctx.css"
        @change="ctx.updateColorText(inputValue($event))"
      />
      <RGBFields v-else-if="ctx.fieldFormat === 'rgb'" />
      <HslFields v-else-if="ctx.fieldFormat === 'hsl'" />
      <HsbFields v-else-if="ctx.fieldFormat === 'hsb'" />
      <OkhclFields v-else />
    </div>
  </div>
</template>
