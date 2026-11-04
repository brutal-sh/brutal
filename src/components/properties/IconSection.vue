<script setup lang="ts">
import { tv } from 'tailwind-variants'
import { computed, ref, watch } from 'vue'

import { MATERIAL_SYMBOLS_PREFIXES } from '@open-pencil/core/icons'
import { iconLayerName, type IconOptions } from '@open-pencil/scene-graph/icons'
import { useIcon } from '@open-pencil/vue/controls/icon'
import { useCommonMessages, usePanelMessages } from '@open-pencil/vue/i18n'

import ColorInput from '@/components/ColorPicker/ColorInput.vue'
import IconPicker from '@/components/icon-picker/IconPicker.vue'
import IconPreview from '@/components/icon-picker/IconPreview.vue'
import IconButton from '@/components/ui/button/IconButton.vue'
import { AppConfirmationDialog } from '@/components/ui/dialog'
import { useHeldContent } from '@/components/ui/overlay/held'
import PanelFieldGroup from '@/components/ui/panel/PanelFieldGroup.vue'
import PanelSection from '@/components/ui/panel/PanelSection.vue'
import AppSelect from '@/components/ui/select/AppSelect.vue'
import theme from '@/theme/select/app'

import { ICON_FAMILIES, ICON_WEIGHT } from './icon/families'
import IconWeightControl from './icon/IconWeightControl.vue'

const { compact = false } = defineProps<{ compact?: boolean }>()
const panels = usePanelMessages()
const common = useCommonMessages()
const {
  frameId,
  name,
  authoredFills,
  options,
  color,
  preview,
  setName,
  modified,
  swap,
  setWeight,
  setWeightEditing,
  cancelWeight,
  weightFailed,
  reset,
  detach,
  setColor,
  setColorPicking
} = useIcon()
const styles = tv(theme)()
const family = computed(() => name.value?.slice(0, name.value.indexOf(':')) ?? '')
const weighted = computed(() => MATERIAL_SYMBOLS_PREFIXES.some((prefix) => prefix === family.value))
const weight = computed(() =>
  typeof options.value?.wght === 'number' ? options.value.wght : ICON_WEIGHT.default
)
const families = computed(() =>
  ICON_FAMILIES.some((entry) => entry.value === family.value)
    ? ICON_FAMILIES
    : [...ICON_FAMILIES, { value: family.value, label: setName.value ?? family.value }]
)

/** An icon picked to replace an edited one, waiting for the edits to be given up. */
const pendingSwap = ref<{ name: string; options?: IconOptions } | null>(null)
const swapShown = useHeldContent(pendingSwap)
// The question is about the icon selected when it was asked; another selection drops it, so a
// confirmation never swaps an icon it did not describe.
watch(frameId, () => {
  pendingSwap.value = null
})

function pick(next: string, options?: IconOptions) {
  if (modified.value) pendingSwap.value = { name: next, options }
  else void swap(next, options)
}

function pickFamily(prefix: string) {
  if (!name.value || prefix === family.value) return
  const options = MATERIAL_SYMBOLS_PREFIXES.some((set) => set === prefix)
    ? { wght: ICON_WEIGHT.default }
    : undefined
  pick(`${prefix}:${iconLayerName(name.value)}`, options)
}

function confirmSwap() {
  const next = pendingSwap.value
  pendingSwap.value = null
  if (next) void swap(next.name, next.options)
}
</script>

<template>
  <PanelSection v-if="name" :label="panels.icon">
    <template v-if="!compact || modified" #actions>
      <span v-if="modified" class="mr-1 text-[11px] text-muted" data-property="icon-modified">
        {{ panels.iconModified }}
      </span>
      <IconButton v-if="modified" :label="panels.resetIcon" @click="reset">
        <icon-lucide-rotate-ccw class="size-3.5" />
      </IconButton>
      <IconButton v-if="!compact" :label="panels.detachIcon" @click="detach">
        <icon-lucide-unlink class="size-3.5" />
      </IconButton>
    </template>
    <PanelFieldGroup :label="compact ? undefined : panels.swapIcon">
      <IconPicker
        :heading="panels.swapIcon"
        :selected="name"
        :set="name.slice(0, name.indexOf(':'))"
        @select="pick"
      >
        <template #trigger>
          <button
            type="button"
            aria-haspopup="listbox"
            data-property="icon-name"
            :aria-label="panels.swapIcon"
            :class="styles.trigger()"
          >
            <IconPreview v-if="!compact" :svg="preview" class="mr-1.5 size-3.5 text-surface" />
            <span :class="styles.value()">
              {{ iconLayerName(name) }}
              <span v-if="!compact" class="text-muted">{{ setName ?? family }}</span>
            </span>
            <icon-lucide-chevron-down class="ml-1 size-3 shrink-0 text-muted" />
          </button>
        </template>
      </IconPicker>
    </PanelFieldGroup>
    <AppSelect
      v-if="compact"
      :model-value="family"
      :options="families"
      :label="panels.iconSet"
      data-property="icon-family"
      class="mt-1.5"
      @update:model-value="pickFamily"
    />
    <PanelFieldGroup v-if="color && !authoredFills" :label="panels.iconColor" class="mt-1.5">
      <ColorInput
        :color="color"
        editable
        data-property="icon-color"
        @update="setColor"
        @open-change="setColorPicking"
      />
    </PanelFieldGroup>
    <IconWeightControl
      v-if="weighted"
      :value="weight"
      :disabled="modified"
      @update="setWeight"
      @editing="setWeightEditing"
      @cancel="cancelWeight"
    />
    <p v-if="weightFailed" role="status" class="mt-1 text-[11px] text-muted">
      {{ panels.iconSearchFailed }}
    </p>
    <AppConfirmationDialog
      :open="pendingSwap !== null"
      :heading="panels.swapEditedIconHeading"
      :description="
        panels.swapEditedIconDescription({
          name: iconLayerName(swapShown?.name ?? '')
        })
      "
      :cancel-label="common.cancel"
      :confirm-label="panels.swapIcon"
      tone="warning"
      @update:open="(open: boolean) => !open && (pendingSwap = null)"
      @confirm="confirmSwap"
    />
  </PanelSection>
</template>
