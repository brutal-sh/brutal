<script setup lang="ts">
import { PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui'
import { computed } from 'vue'

import type { Effect, SceneNode } from '@open-pencil/scene-graph'
import type { Color } from '@open-pencil/scene-graph/primitives'
import { useEffectsControls } from '@open-pencil/vue/controls/effects'
import { useI18n } from '@open-pencil/vue/i18n'

import ColorPicker from '@/components/ColorPicker/ColorPicker.vue'
import {
  commitDiscretePropertyListChange,
  useBlendModeGroups
} from '@/components/inputs/blend-mode'
import NumberField from '@/components/inputs/NumberField.vue'
import PaintField from '@/components/inputs/PaintField.vue'
import PropertyItemRow from '@/components/properties/item-list/PropertyItemRow.vue'
import PaintValue from '@/components/properties/paint/PaintValue.vue'
import IconButton from '@/components/ui/button/IconButton.vue'
import { usePopoverUI } from '@/components/ui/overlay/popover'
import AppSelect from '@/components/ui/select/AppSelect.vue'

const { effect, index, activeNode, patch, flush } = defineProps<{
  effect: Effect
  index: number
  activeNode: SceneNode | null
  patch: (index: number, changes: Partial<Effect>) => void
  flush: () => void
}>()
const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{ remove: [] }>()
const { panels } = useI18n()
const controls = useEffectsControls()
const options = computed(() =>
  controls.effectOptions
    .filter((option) => option.value !== 'FOREGROUND_BLUR')
    .map((option) => ({
      ...option,
      disabled:
        (option.value === 'LAYER_BLUR' || option.value === 'BACKGROUND_BLUR') &&
        (activeNode?.effects.some(
          (effect, position) => position !== index && effect.type === option.value
        ) ??
          false)
    }))
)
const label = computed(
  () => controls.effectOptions.find((option) => option.value === effect.type)?.label ?? effect.type
)
const blends = useBlendModeGroups()
const styles = usePopoverUI({ content: 'w-[264px] max-w-[calc(100vw-1rem)]' })
function setType(type: string) {
  const option = options.value.find((option) => option.value === type && !option.disabled)
  if (option)
    commitDiscretePropertyListChange(flush, () =>
      controls.updateType(patch, activeNode, index, option.value)
    )
}
function close(value: boolean) {
  if (!value) flush()
}
function setColor(color: Color) {
  controls.updateColor(patch, index, color)
  flush()
}
</script>

<template>
  <PropertyItemRow
    prop-key="effects"
    :index="index"
    :visibility-label="panels.toggleVisibility"
    :remove-label="panels.removeEffect"
    @remove="emit('remove')"
  >
    <PopoverRoot v-model:open="open" @update:open="close">
      <PopoverTrigger as-child>
        <button
          type="button"
          class="flex h-6 min-w-0 flex-1 items-center gap-1 rounded border border-transparent bg-panel-field px-1.5 text-left text-[11px] text-surface hover:bg-panel-field-hover focus-visible:border-panel-focus"
          :aria-label="label"
        >
          <icon-lucide-copy
            v-if="controls.isShadow(effect.type)"
            class="size-3.5 shrink-0 text-muted"
          />
          <icon-lucide-blend v-else class="size-3.5 shrink-0 text-muted" />
          <span class="truncate">{{ label }}</span>
        </button>
      </PopoverTrigger>
      <PopoverPortal>
        <PopoverContent
          data-effect-popup
          side="left"
          align="start"
          :side-offset="8"
          :class="styles.content"
          :aria-label="panels.effects"
          @escape-key-down="$event.stopPropagation()"
        >
          <div class="flex items-center gap-2 border-b border-border p-3">
            <AppSelect
              :model-value="effect.type"
              :options="options"
              :label="panels.effects"
              @update:model-value="setType"
            />
            <AppSelect
              v-if="controls.isShadow(effect.type)"
              :model-value="effect.blendMode ?? 'NORMAL'"
              :groups="blends"
              :label="panels.blendMode"
              @update:model-value="
                commitDiscretePropertyListChange(flush, () =>
                  patch(index, { blendMode: $event as Effect['blendMode'] })
                )
              "
            >
              <template #trigger
                ><IconButton :label="panels.blendMode"
                  ><icon-lucide-droplet class="size-4" /></IconButton
              ></template>
            </AppSelect>
          </div>
          <div
            class="grid grid-cols-[52px_1fr] items-center gap-x-2 gap-y-1.5 p-3 text-[11px] text-muted"
          >
            <template v-if="controls.isShadow(effect.type)">
              <span>{{ panels.effectColor }}</span>
              <PaintField
                :opacity="effect.color.a"
                :opacity-label="panels.opacity"
                compact
                @update:opacity="controls.updateColor(patch, index, { ...effect.color, a: $event })"
              >
                <template #preview
                  ><ColorPicker
                    :color="effect.color"
                    compact
                    @update="controls.updateColor(patch, index, $event)"
                    @open-change="!$event && flush()"
                /></template>
                <template #value
                  ><PaintValue :color="effect.color" :label="panels.effectColor" @update="setColor"
                /></template>
              </PaintField>
              <span>{{ panels.effectOffset }}</span>
              <div class="flex min-w-0 gap-1.5">
                <NumberField
                  v-for="axis in ['x', 'y'] as const"
                  :key="axis"
                  :icon="axis.toUpperCase()"
                  :aria-label="axis === 'x' ? panels.xAxis : panels.yAxis"
                  :model-value="effect.offset[axis]"
                  @update:model-value="
                    controls.scrubEffect(index, { offset: { ...effect.offset, [axis]: $event } })
                  "
                  @commit="
                    controls.commitEffect(index, { offset: { ...effect.offset, [axis]: $event } })
                  "
                />
              </div>
            </template>
            <span>{{ panels.effectBlur }}</span>
            <NumberField
              :aria-label="panels.effectBlur"
              :model-value="effect.radius"
              :min="0"
              @update:model-value="controls.scrubEffect(index, { radius: $event })"
              @commit="controls.commitEffect(index, { radius: $event })"
              ><template #icon><icon-lucide-focus class="size-3.5" /></template
            ></NumberField>
          </div>
        </PopoverContent>
      </PopoverPortal>
    </PopoverRoot>
  </PropertyItemRow>
</template>
