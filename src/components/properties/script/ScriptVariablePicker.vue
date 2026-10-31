<script setup lang="ts">
import { computed } from 'vue'

import type { ScriptInput } from '@open-pencil/core/scripts/header'
import { colorToHex8 } from '@open-pencil/scene-graph/color'
import {
  resolveScriptInputVariables,
  scriptInputVariable,
  scriptOfNode
} from '@open-pencil/scene-graph/scripts'
import { useI18n } from '@open-pencil/vue/i18n'

import { useEditorStore } from '@/app/editor/active-store'
import { VariablePicker, type VariablePickerItem } from '@/components/ui/binding'

const { nodeId, input, disabled } = defineProps<{
  nodeId: string
  input: ScriptInput
  disabled: boolean
}>()
const emit = defineEmits<{ detach: [value: string | number | boolean] }>()
const store = useEditorStore()
const { panels, common } = useI18n()
const node = computed(() => {
  void store.state.sceneVersion
  return store.graph.getNode(nodeId)
})
const variable = computed(
  () => node.value && scriptInputVariable(store.graph, node.value, input.name)
)
const bound = computed(() =>
  String((node.value && scriptOfNode(node.value)?.inputs[input.name]) || '').startsWith('$')
)
const items = computed<VariablePickerItem[]>(() => {
  void store.state.sceneVersion
  return [...store.graph.variables.values()]
    .filter((v) => v.type === (input.type === 'color' ? 'COLOR' : 'FLOAT'))
    .map((v) => {
      let value
      try {
        value = node.value && store.graph.resolveVariableForNode(nodeId, v.id)
      } catch {
        value = undefined
      }
      const item = {
        id: v.id,
        name: v.name,
        collection: store.graph.variableCollections.get(v.collectionId)?.name
      }
      if (typeof value === 'object') return { ...item, color: value, text: colorToHex8(value) }
      return { ...item, text: value === undefined ? '' : String(value) }
    })
})
function detach() {
  let value = input.value
  try {
    if (node.value)
      value =
        resolveScriptInputVariables(store.graph, node.value, {
          [input.name]: scriptOfNode(node.value)?.inputs[input.name] ?? input.value
        })[input.name] ?? input.value
  } catch {
    value = input.value
  }
  if (input.type === 'number' && typeof value !== 'number') value = input.value
  if (input.type === 'color' && typeof value !== 'string') value = input.value
  emit('detach', value)
}
</script>

<template>
  <VariablePicker
    :items="items"
    :selected="variable?.id"
    :state="bound ? (variable ? 'bound' : 'unresolved') : 'unbound'"
    :trigger-label="`${panels.applyVariable}: ${input.name}`"
    :search-placeholder="common.search"
    :empty-label="panels.noVariablesFound"
    :detach-label="panels.detachVariable"
    :disabled="disabled"
    side="left"
    @select="store.setScriptInputVariable(nodeId, input.name, $event)"
    @detach="detach"
  />
</template>
