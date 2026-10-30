<script setup lang="ts">
import { PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui'
import { tv } from 'tailwind-variants'
import { computed, ref } from 'vue'

import type { Fill, MeshGradient } from '@open-pencil/scene-graph'
import { colorToCSS, colorToHexRaw } from '@open-pencil/scene-graph/color'
import { BLACK } from '@open-pencil/scene-graph/constants'
import { createMeshGradient, resizeMeshGradient } from '@open-pencil/scene-graph/gradient/mesh'
import type { Color } from '@open-pencil/scene-graph/primitives'
import { randomIndex } from '@open-pencil/scene-graph/random'
import { useI18n } from '@open-pencil/vue/i18n'

import ColorPicker from '@/components/ColorPicker/ColorPicker.vue'
import { MeshIndependentIcon, MeshMirroredIcon } from '@/components/icons/paint'
import AppButton from '@/components/ui/button/AppButton.vue'
import { usePopoverUI } from '@/components/ui/overlay/popover'
import SegmentedControl from '@/components/ui/select/SegmentedControl.vue'
import theme from '@/theme/fill-picker-mesh'

const { fill } = defineProps<{ fill: Fill }>()
const emit = defineEmits<{ update: [fill: Fill, colorSources?: (number | null)[]] }>()
const activePoint = defineModel<number>('activePoint')
const selectedPoints = defineModel<number[]>('selectedPoints', { default: () => [] })
const mirrored = defineModel<boolean>('mirrored', { default: true })
const outline = defineModel<boolean>('outline', { default: true })
const { panels } = useI18n()
const cls = tv(theme)()
const popup = usePopoverUI({ content: 'w-36 p-2' })
const gridOpen = ref(false)
const gridChoice = ref({ columns: 1, rows: 1 })
const mesh = computed(() => fill.meshGradient)
const selectedIndices = computed(() =>
  [
    ...new Set(selectedPoints.value.length ? selectedPoints.value : [activePoint.value ?? -1])
  ].filter((index) => mesh.value?.points[index])
)
const selected = computed(() => mesh.value?.points[selectedIndices.value[0]])
const selectedColor = computed(() =>
  selected.value ? mesh.value?.colors[selectedIndices.value[0]] : undefined
)
const mixedColor = computed(() => {
  const current = mesh.value
  const first = selectedColor.value
  return current && first
    ? selectedIndices.value.some((index) => colorToCSS(current.colors[index]) !== colorToCSS(first))
    : false
})
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
  selectedPoints.value = []
  gridOpen.value = false
}
function shuffle() {
  if (!mesh.value) return
  const next = structuredClone(mesh.value)
  const sources = next.colors.map((_, index) => index)
  const indices = selectedIndices.value.length ? selectedIndices.value : sources
  if (indices.length < 2) return
  for (let index = indices.length - 1; index > 0; index--) {
    const a = indices[index]
    const b = indices[randomIndex(index + 1)]
    ;[next.colors[a], next.colors[b]] = [next.colors[b], next.colors[a]]
    ;[sources[a], sources[b]] = [sources[b], sources[a]]
  }
  update(next, sources)
}
function reset(curve: boolean) {
  if (!mesh.value || !selected.value) return
  const next = structuredClone(mesh.value)
  const defaults = createMeshGradient(next.columns, next.rows)
  for (const index of selectedIndices.value)
    next.points[index] = curve
      ? { position: { ...next.points[index].position } }
      : { ...next.points[index], position: defaults.points[index].position }
  update(next)
}
function setColor(color: Color) {
  if (!mesh.value || !selected.value) return
  const next = structuredClone(mesh.value)
  for (const index of selectedIndices.value) next.colors[index] = { ...color }
  update(
    next,
    next.colors.map((_, source) => (selectedIndices.value.includes(source) ? null : source))
  )
}
function selectPoint(index: number, event: MouseEvent) {
  let points = [index]
  if (event.shiftKey)
    points = selectedIndices.value.includes(index)
      ? selectedIndices.value.filter((point) => point !== index)
      : [...selectedIndices.value, index]
  selectedPoints.value = points
  activePoint.value = points.at(-1) ?? -1
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
          :ui="{ root: 'w-full', item: 'min-w-0 font-normal' }"
          @update:model-value="mirrored = $event === 'mirrored'"
        >
          <template #option="{ option }"
            ><MeshMirroredIcon
              v-if="option.value === 'mirrored'"
              class="size-4" /><MeshIndependentIcon v-else class="size-4"
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
          :ui="{ root: 'w-full', item: 'font-normal' }"
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
          :aria-pressed="selectedIndices.includes(index)"
          :data-active="selectedIndices.includes(index) || undefined"
          @click="selectPoint(index, $event)"
        />
      </div>
      <AppButton :class="cls.action({ class: 'mt-2 w-full' })" @click="shuffle">{{
        selected ? panels.meshShuffleSelected : panels.meshShuffleColors
      }}</AppButton>
    </div>
    <div v-if="selected && selectedColor" :class="cls.selected()">
      <span :class="cls.label()">{{
        selectedIndices.length > 1 ? panels.meshSelectedPoints : panels.meshSelectedPoint
      }}</span>
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
        <ColorPicker :color="mixedColor ? BLACK : selectedColor" compact @update="setColor">
          <template #trigger="{ style }"
            ><AppButton
              :class="cls.action({ class: 'justify-start' })"
              :aria-label="panels.editColor"
              ><span
                :class="cls.selectedSwatch()"
                :data-mixed="mixedColor || undefined"
                :style="mixedColor ? undefined : style"
              />{{ mixedColor ? panels.mixed : colorToHexRaw(selectedColor)
              }}<span v-if="!mixedColor" class="ml-auto"
                >{{ Math.round(selectedColor.a * 100) }}%</span
              ></AppButton
            ></template
          >
        </ColorPicker>
      </div>
    </div>
  </div>
</template>
