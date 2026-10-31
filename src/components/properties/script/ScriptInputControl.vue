<script setup lang="ts">
import { computed, onScopeDispose, ref, watch } from 'vue'

import { getNodeEditCapability } from '@open-pencil/core'
import type { ScriptInput } from '@open-pencil/core/scripts/header'
import { colorToHex8, parseColor } from '@open-pencil/scene-graph/color'
import { scriptOfNode, withScript, type ScriptValue } from '@open-pencil/scene-graph/scripts'
import { useNodePreview } from '@open-pencil/vue/controls/node-props'
import { useRetainedActivity } from '@open-pencil/vue/lifecycle/retention'

import { useEditorStore } from '@/app/editor/active-store'
import ColorInput from '@/components/ColorPicker/ColorInput.vue'
import NumberField from '@/components/inputs/NumberField.vue'
import AppTextarea from '@/components/ui/input/AppTextarea.vue'
import PanelFieldGroup from '@/components/ui/panel/PanelFieldGroup.vue'
import AppSelect from '@/components/ui/select/AppSelect.vue'
import AppCheckbox from '@/components/ui/toggle/AppCheckbox.vue'

const { nodeId, input } = defineProps<{ nodeId: string; input: ScriptInput }>()
const store = useEditorStore()
const preview = useNodePreview(store)
const retained = useRetainedActivity()
const active = ref(true)
let editing = false
onScopeDispose(() => {
  active.value = false
})
watch(
  () => retained?.value,
  (current) => {
    if (current === false) {
      editing = false
      preview.cancel()
    }
  },
  { flush: 'sync' }
)
const definition = computed(() => {
  void store.state.sceneVersion
  const node = store.graph.getNode(nodeId)
  return node && scriptOfNode(node)
})
const value = computed(() => definition.value?.inputs[input.name] ?? input.value)
const editable = computed(
  () =>
    active.value &&
    retained?.value !== false &&
    !store.state.readOnly &&
    getNodeEditCapability(store.graph, nodeId).editable
)
const color = computed(() => parseColor(String(value.value)))
const choices = computed(() =>
  (input.options ?? []).map((option) => ({ value: option, label: option }))
)

function edit(open: boolean) {
  editing = open && editable.value
  if (!open) preview.commit()
}
function setValue(next: ScriptValue) {
  const node = store.graph.getNode(nodeId)
  const current = node && scriptOfNode(node)
  if (!node || !current || !editable.value) return
  const nextDefinition = { ...current, inputs: { ...current.inputs, [input.name]: next } }
  if (editing)
    preview.update([nodeId], { pluginData: withScript(node, nextDefinition) }, 'Set script input')
  else store.setScriptDefinition(nodeId, nextDefinition)
}
function cancel() {
  editing = false
  preview.cancel()
}
</script>

<template>
  <PanelFieldGroup
    :label="input.name"
    :ui="{
      root: 'grid grid-cols-[60px_minmax(0,1fr)] items-start gap-2',
      label: 'mt-1.5 mb-0 leading-3.5',
      container: 'min-h-6 justify-center'
    }"
  >
    <NumberField
      v-if="input.type === 'number'"
      :model-value="Number(value)"
      :aria-label="input.name"
      icon="#"
      :disabled="!editable"
      @editing-change="edit"
      @update:model-value="setValue"
      @commit="
        (next) => {
          setValue(next)
          edit(false)
        }
      "
      @cancel="cancel"
    />
    <AppCheckbox
      v-else-if="input.type === 'boolean'"
      neutral
      :ariaLabel="input.name"
      :model-value="value === true"
      :disabled="!editable"
      @update:model-value="setValue"
    />
    <AppSelect
      v-else-if="input.type === 'enum'"
      :model-value="String(value)"
      :label="input.name"
      :options="choices"
      :disabled="!editable"
      @update:model-value="setValue"
    />
    <div
      v-else-if="input.type === 'color'"
      class="flex min-w-0 items-center rounded bg-panel-field"
    >
      <ColorInput
        :color="color"
        editable
        :inert="!editable || undefined"
        :aria-label="input.name"
        class="min-w-0 flex-1 gap-1 px-1 [&_input]:font-sans [&_input]:text-[11px]"
        @open-change="edit"
        @update="setValue(colorToHex8($event))"
      />
      <NumberField
        :model-value="Math.round(color.a * 100)"
        :aria-label="`${input.name} opacity`"
        :min="0"
        :max="100"
        suffix="%"
        :disabled="!editable"
        :ui="{ root: 'w-14 flex-none rounded-l-none border-l border-border', leading: 'hidden' }"
        @editing-change="edit"
        @update:model-value="setValue(colorToHex8({ ...color, a: $event / 100 }))"
        @commit="
          (next) => {
            setValue(colorToHex8({ ...color, a: next / 100 }))
            edit(false)
          }
        "
        @cancel="cancel"
      />
    </div>
    <AppTextarea
      v-else
      :model-value="String(value)"
      :aria-label="input.name"
      :disabled="!editable"
      :rows="2"
      @focus="edit(true)"
      @update:model-value="setValue"
      @blur="edit(false)"
      @keydown.esc="cancel"
    />
  </PanelFieldGroup>
</template>
