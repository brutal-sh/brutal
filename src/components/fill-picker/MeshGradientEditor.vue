<script setup lang="ts">
import { PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui'
import { tv } from 'tailwind-variants'
import { computed, ref } from 'vue'

import type { Fill, MeshGradient } from '@open-pencil/scene-graph'
import { colorToCSS, colorToHexRaw } from '@open-pencil/scene-graph/color'
import { createMeshGradient, resizeMeshGradient } from '@open-pencil/scene-graph/gradient/mesh'
import type { Color } from '@open-pencil/scene-graph/primitives'
import { randomIndex } from '@open-pencil/scene-graph/random'
import { useI18n } from '@open-pencil/vue/i18n'

import ColorPicker from '@/components/ColorPicker/ColorPicker.vue'
import AppButton from '@/components/ui/button/AppButton.vue'
import { usePopoverUI } from '@/components/ui/overlay/popover'
import SegmentedControl from '@/components/ui/select/SegmentedControl.vue'
import theme from '@/theme/fill-picker-mesh'

const { fill } = defineProps<{ fill: Fill }>()
const emit = defineEmits<{ update: [fill: Fill, colorSources?: (number | null)[]] }>()
const activePoint = defineModel<number>('activePoint')
const mirrored = defineModel<boolean>('mirrored', { default: true })
const outline = defineModel<boolean>('outline', { default: true })
const { panels } = useI18n()
const cls = tv(theme)()
const popup = usePopoverUI({ content: 'w-36 p-2' })
const gridOpen = ref(false)
const gridChoice = ref({ columns: 1, rows: 1 })
const mesh = computed(() => fill.meshGradient)
const selected = computed(() =>
  activePoint.value === undefined ? undefined : mesh.value?.points[activePoint.value]
)
const selectedColor = computed(() =>
  selected.value ? mesh.value?.colors[activePoint.value ?? -1] : undefined
)
const gridStyle = computed(() => ({
  gridTemplateColumns: `repeat(${(mesh.value?.columns ?? 2) - 1}, 1fr)`
}))
const paletteStyle = computed(() => ({
  gridTemplateColumns: `repeat(${mesh.value?.columns ?? 2}, 24px)`
}))

function update(next: MeshGradient, colorSources?: (number | null)[]) {
  emit('update', { ...fill, meshGradient: next }, colorSources)
}
function resize(columns: number, rows: number) {
  if (!mesh.value || (mesh.value.columns === columns && mesh.value.rows === rows)) return
  const previousCount = mesh.value.colors.length
  update(
    resizeMeshGradient(mesh.value, columns, rows),
    Array.from({ length: columns * rows }, (_, index) => index % previousCount)
  )
  activePoint.value = -1
  gridOpen.value = false
}
function shuffle() {
  if (!mesh.value || selected.value) return
  const next = structuredClone(mesh.value)
  const sources = next.colors.map((_, index) => index)
  for (let index = next.colors.length - 1; index > 0; index--) {
    const other = randomIndex(index + 1)
    ;[next.colors[index], next.colors[other]] = [next.colors[other], next.colors[index]]
    ;[sources[index], sources[other]] = [sources[other], sources[index]]
  }
  update(next, sources)
}
function reset(curve: boolean) {
  const index = activePoint.value
  if (!mesh.value || index === undefined || !selected.value) return
  const next = structuredClone(mesh.value)
  const defaults = createMeshGradient(next.columns, next.rows)
  next.points[index] = curve
    ? { position: { ...selected.value.position } }
    : { ...next.points[index], position: defaults.points[index].position }
  update(next)
}
function setColor(color: Color) {
  const index = activePoint.value
  if (!mesh.value || index === undefined || !selected.value) return
  const next = structuredClone(mesh.value)
  next.colors[index] = color
  update(
    next,
    next.colors.map((_, source) => (source === index ? null : source))
  )
}
</script>

<template>
  <div v-if="mesh" :class="cls.body()" data-test-id="mesh-gradient-editor">
    <div :class="cls.settings()">
      <div>
        <span :class="cls.label()">{{ panels.meshGrid }}</span>
        <PopoverRoot v-model:open="gridOpen">
          <PopoverTrigger
            :class="cls.gridPreview()"
            :style="gridStyle"
            :aria-label="`${panels.meshGrid}: ${mesh.columns - 1} × ${mesh.rows - 1}`"
            @click="gridChoice = { columns: mesh.columns - 1, rows: mesh.rows - 1 }"
          >
            <span
              v-for="cell in (mesh.columns - 1) * (mesh.rows - 1)"
              :key="cell"
              :class="cls.gridCell()"
            />
            <span :class="cls.gridLabel()">{{ mesh.columns - 1 }} × {{ mesh.rows - 1 }}</span>
          </PopoverTrigger>
          <PopoverPortal>
            <PopoverContent
              :class="popup.content"
              side="top"
              :side-offset="4"
              :aria-label="panels.meshGridSize"
            >
              <span :class="cls.label()">{{ panels.meshGridSize }}</span>
              <span :class="cls.gridSize()" role="status" aria-live="polite"
                >{{ gridChoice.columns }} × {{ gridChoice.rows }}</span
              >
              <div :class="cls.gridChoices()">
                <template v-for="row in 5" :key="row">
                  <button
                    v-for="column in 5"
                    :key="column"
                    type="button"
                    :class="cls.gridChoice()"
                    :aria-label="`${column} × ${row}`"
                    :data-active="
                      (column <= gridChoice.columns && row <= gridChoice.rows) || undefined
                    "
                    @pointerenter="gridChoice = { columns: column, rows: row }"
                    @focus="gridChoice = { columns: column, rows: row }"
                    @click="resize(column + 1, row + 1)"
                  />
                </template>
              </div>
            </PopoverContent>
          </PopoverPortal>
        </PopoverRoot>
      </div>
      <div>
        <span :class="cls.label()">{{ panels.meshMirroring }}</span>
        <SegmentedControl
          :model-value="mirrored ? 'mirrored' : 'independent'"
          :label="panels.meshMirroring"
          :options="[
            { value: 'mirrored', label: panels.meshMirroredHandles },
            { value: 'independent', label: panels.meshIndependentHandles }
          ]"
          :ui="{ root: 'w-full', item: 'min-w-0' }"
          @update:model-value="mirrored = $event === 'mirrored'"
        >
          <template #option="{ option }"
            ><icon-lucide-spline
              v-if="option.value === 'mirrored'"
              class="size-4" /><icon-lucide-git-branch v-else class="size-4"
          /></template>
        </SegmentedControl>
        <span :class="cls.label()" class="mt-3">{{ panels.meshOutline }}</span>
        <SegmentedControl
          :model-value="outline ? 'on' : 'off'"
          :label="panels.meshOutline"
          :options="[
            { value: 'off', label: panels.propertyOff },
            { value: 'on', label: panels.propertyOn }
          ]"
          :ui="{ root: 'w-full' }"
          @update:model-value="outline = $event === 'on'"
        />
      </div>
    </div>
    <div>
      <span :class="cls.label()">{{ panels.meshColors }}</span>
      <div :class="cls.palette()" :style="paletteStyle">
        <button
          v-for="(color, index) in mesh.colors"
          :key="index"
          type="button"
          :class="cls.color()"
          :style="{ background: colorToCSS(color) }"
          :aria-label="`${panels.meshColors} ${index + 1}`"
          :aria-pressed="activePoint === index"
          :data-active="activePoint === index || undefined"
          @click="activePoint = index"
        />
      </div>
      <AppButton :class="cls.action({ class: 'mt-2 w-full' })" @click="shuffle">{{
        selected ? panels.meshShuffleSelected : panels.meshShuffleColors
      }}</AppButton>
    </div>
    <div v-if="selected && selectedColor" :class="cls.selected()">
      <span :class="cls.label()">{{ panels.meshSelectedPoint }}</span>
      <div :class="cls.selectedRow()">
        <span>{{ panels.meshPoint }}</span
        ><AppButton :class="cls.action()" @click="reset(false)">{{
          panels.meshResetPosition
        }}</AppButton>
      </div>
      <div :class="cls.selectedRow()">
        <span>{{ panels.meshHandles }}</span
        ><AppButton :class="cls.action()" @click="reset(true)">{{
          panels.meshResetCurve
        }}</AppButton>
      </div>
      <div :class="cls.selectedColor()">
        <span>{{ panels.paintColor }}</span>
        <ColorPicker :color="selectedColor" compact @update="setColor">
          <template #trigger="{ style }"
            ><AppButton :class="cls.action({ class: 'flex-1' })" :aria-label="panels.editColor"
              ><span class="size-4 rounded-sm border border-border" :style="style" />{{
                colorToHexRaw(selectedColor)
              }}<span class="ml-auto">{{ Math.round(selectedColor.a * 100) }}%</span></AppButton
            ></template
          >
        </ColorPicker>
      </div>
    </div>
  </div>
</template>
