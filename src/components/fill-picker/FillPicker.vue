<script setup lang="ts">
import { PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui'
import type { FocusOutsideEvent, PointerDownOutsideEvent } from 'reka-ui'
import { tv } from 'tailwind-variants'
import { computed } from 'vue'

import type { BlendMode, Fill } from '@open-pencil/scene-graph'
import type { ShaderPaint, ShaderPreset } from '@open-pencil/scene-graph/shaders'
import { applySolidFillColor, type OkHCLControls } from '@open-pencil/vue/controls/color-model'
import { DEFAULT_SHADER_PRESET } from '@open-pencil/vue/controls/shader'
import { useI18n } from '@open-pencil/vue/i18n'
import { useRetainedPopup } from '@open-pencil/vue/lifecycle/retention'
import { FillRoot } from '@open-pencil/vue/primitives/Fill'

import ColorPickerPanel from '@/components/color-picker-panel/ColorPickerPanel.vue'
import GradientEditor from '@/components/fill-picker/GradientEditor.vue'
import ImageFillPicker from '@/components/fill-picker/ImageFillPicker.vue'
import ShaderFillPicker from '@/components/fill-picker/shader/ShaderFillPicker.vue'
import { useBlendModeGroups } from '@/components/inputs/blend-mode'
import IconButton from '@/components/ui/button/IconButton.vue'
import { usePopoverUI } from '@/components/ui/overlay/popover'
import Tip from '@/components/ui/overlay/Tip.vue'
import FillSwatch from '@/components/ui/paint/FillSwatch.vue'
import AppSelect from '@/components/ui/select/AppSelect.vue'
import fillPickerTheme from '@/theme/fill-picker'

import { useImageFill } from './useImageFill'

const fillPicker = tv(fillPickerTheme)

function tabClass(active: boolean) {
  return fillPicker({ active }).tab()
}

const {
  fill,
  okhcl = null,
  swatchBackground,
  keepOpen,
  compact = false,
  shader = null,
  layerSize = null
} = defineProps<{
  fill: Fill
  compact?: boolean
  /** The shader the paint draws, when it is a shader's frame; the picker then edits the shader. */
  shader?: ShaderPaint | null
  okhcl?: OkHCLControls | null
  swatchBackground?: string
  /** Names the trigger for a paint that is not a fill, such as a stroke. */
  label?: string
  /** Whether a press outside the picker should leave it open, such as on a gradient handle. */
  keepOpen?: (event: PointerEvent) => boolean
  /** The one layer the paint is on, which an image crop starts by covering. */
  layerSize?: { width: number; height: number } | null
}>()
/** An image fill's swatch shows its image, covering the swatch as Fill would. */
const image = useImageFill(() => (fill.type === 'IMAGE' ? fill.imageHash : undefined))
const imageBackground = computed(() =>
  image.url.value ? `center / cover no-repeat url("${image.url.value}")` : undefined
)
const activeStop = defineModel<number>('activeStop')
const emit = defineEmits<{
  update: [fill: Fill]
  updateBlendMode: [mode: BlendMode]
  updateShader: [preset: ShaderPreset]
  openChange: [open: boolean]
  cancel: []
}>()
const { open: popupOpen, portalActive } = useRetainedPopup(undefined, () => {
  emit('cancel')
  emit('openChange', false)
})
const cls = usePopoverUI({
  content: 'max-h-(--reka-popover-content-available-height) w-[264px] overflow-y-auto'
})
const { panels } = useI18n()
const blendModeGroups = useBlendModeGroups()
const colorLabel = computed(() => (compact ? panels.value.paintColor : panels.value.solid))
const gradientLabel = computed(() =>
  compact ? panels.value.paintGradient : panels.value.linearGradient
)

/** Dragging a gradient handle on the canvas leaves the picker open, as in Figma. */
function keepOpenOnPress(event: PointerDownOutsideEvent) {
  if (keepOpen?.(event.detail.originalEvent)) event.preventDefault()
}

/** A press focuses the canvas before the press itself reaches the picker, so the press decides. */
function keepOpenOnFocus(event: FocusOutsideEvent) {
  if (keepOpen && event.detail.originalEvent.target instanceof HTMLCanvasElement)
    event.preventDefault()
}

function stopEscapePropagation(event: KeyboardEvent) {
  event.stopPropagation()
}
</script>

<template>
  <FillRoot :fill="fill" @update="emit('update', $event)" v-slot="root">
    <PopoverRoot v-model:open="popupOpen" @update:open="emit('openChange', $event)">
      <PopoverTrigger as-child>
        <button
          type="button"
          :aria-label="label ?? panels.fill"
          data-test-id="fill-picker-swatch"
          class="size-4 shrink-0 cursor-pointer rounded-sm border-0 bg-transparent p-0"
        >
          <FillSwatch :fill="fill" class="size-full" v-slot="swatch">
            <span
              class="pointer-events-none absolute inset-0"
              :style="{ background: swatchBackground ?? imageBackground ?? swatch.background }"
            />
          </FillSwatch>
        </button>
      </PopoverTrigger>

      <PopoverPortal v-if="portalActive">
        <PopoverContent
          :class="[cls.content, compact ? 'p-0' : 'p-3']"
          :side-offset="4"
          side="left"
          data-picker-content
          @escape-key-down="stopEscapePropagation"
          @pointer-down-outside="keepOpenOnPress"
          @focus-outside="keepOpenOnFocus"
        >
          <div
            class="flex items-center gap-2"
            :class="compact ? 'border-b border-border p-3' : 'mb-2'"
          >
            <div
              class="flex min-w-0 flex-1 items-center gap-0.5"
              :class="compact ? 'rounded-md bg-input' : undefined"
            >
              <Tip :label="colorLabel">
                <button
                  :data-active="root.category === 'SOLID' || undefined"
                  :aria-pressed="root.category === 'SOLID'"
                  :class="tabClass(root.category === 'SOLID')"
                  :aria-label="colorLabel"
                  data-test-id="fill-picker-tab-solid"
                  @click="root.actions.toSolid"
                >
                  <icon-lucide-square class="size-3.5" />
                </button>
              </Tip>
              <Tip :label="gradientLabel">
                <button
                  :data-active="root.category === 'GRADIENT' || undefined"
                  :aria-pressed="root.category === 'GRADIENT'"
                  :class="tabClass(root.category === 'GRADIENT')"
                  :aria-label="gradientLabel"
                  data-test-id="fill-picker-tab-gradient"
                  @click="root.actions.toGradient"
                >
                  <icon-lucide-blend class="size-3.5" />
                </button>
              </Tip>
              <Tip :label="panels.image">
                <button
                  :data-active="(root.category === 'IMAGE' && !shader) || undefined"
                  :aria-pressed="root.category === 'IMAGE' && !shader"
                  :class="tabClass(root.category === 'IMAGE' && !shader)"
                  :aria-label="panels.image"
                  data-test-id="fill-picker-tab-image"
                  @click="root.actions.toImage"
                >
                  <icon-lucide-image class="size-3.5" />
                </button>
              </Tip>
              <Tip :label="panels.shader">
                <button
                  :data-active="shader !== null || undefined"
                  :aria-pressed="shader !== null"
                  :class="tabClass(shader !== null)"
                  :aria-label="panels.shader"
                  data-test-id="fill-picker-tab-shader"
                  @click="shader || emit('updateShader', DEFAULT_SHADER_PRESET)"
                >
                  <icon-lucide-sparkles class="size-3.5" />
                </button>
              </Tip>
            </div>
            <AppSelect
              v-if="compact"
              :model-value="fill.blendMode ?? 'NORMAL'"
              :groups="blendModeGroups"
              :label="panels.blendMode"
              :ui="{
                content: 'w-32 min-w-32 rounded-md',
                item: 'h-7 pr-7 pl-3 text-xs',
                indicator: 'right-0 left-auto'
              }"
              @update:model-value="emit('updateBlendMode', $event)"
            >
              <template #trigger>
                <IconButton
                  :label="panels.blendMode"
                  :active="!!fill.blendMode && fill.blendMode !== 'NORMAL'"
                >
                  <icon-lucide-droplet class="size-4" />
                </IconButton>
              </template>
            </AppSelect>
          </div>

          <div :class="compact ? 'p-3' : undefined">
            <ColorPickerPanel
              :compact="compact"
              v-if="root.category === 'SOLID'"
              :color="root.fill.color"
              :okhcl="okhcl"
              @update="emit('update', applySolidFillColor(root.fill, $event))"
            />

            <GradientEditor
              :compact="compact"
              v-if="root.category === 'GRADIENT'"
              v-model:active-stop="activeStop"
              :fill="root.fill"
              @update="emit('update', $event)"
            />

            <ShaderFillPicker
              v-if="shader"
              :preset="shader.preset"
              @update="emit('updateShader', $event)"
            />

            <ImageFillPicker
              v-else-if="root.category === 'IMAGE'"
              :fill="root.fill"
              :layer-size="layerSize"
              @update="emit('update', $event)"
            />
          </div>
        </PopoverContent>
      </PopoverPortal>
    </PopoverRoot>
  </FillRoot>
</template>
