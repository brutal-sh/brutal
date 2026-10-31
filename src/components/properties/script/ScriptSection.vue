<script setup lang="ts">
import { useFileDialog } from '@vueuse/core'
import { isEqual } from 'es-toolkit/predicate'
import { dirname, relative } from 'pathe'
import { computed, onScopeDispose, ref, watch } from 'vue'

import { getNodeEditCapability } from '@open-pencil/core'
import { hasCurrentScriptOutput, scriptOfNode } from '@open-pencil/scene-graph/scripts'
import { useRetainedActivity } from '@open-pencil/vue/lifecycle/retention'

import { documentSourceFilePath } from '@/app/document/io/assets'
import { useEditorStore } from '@/app/editor/active-store'
import { isTauri } from '@/app/tauri/env'
import AppButton from '@/components/ui/button/AppButton.vue'
import IconButton from '@/components/ui/button/IconButton.vue'
import AppAlert from '@/components/ui/feedback/AppAlert.vue'
import AppInput from '@/components/ui/input/AppInput.vue'
import PanelSection from '@/components/ui/panel/PanelSection.vue'

import ScriptInputControl from './ScriptInputControl.vue'

const { nodeId } = defineProps<{ nodeId: string }>()
const store = useEditorStore()
const active = ref(true)
const retained = useRetainedActivity()
onScopeDispose(() => {
  active.value = false
  pickVersion++
  pendingPick = null
  editingId.value = null
  pathTarget = null
})
const definition = computed(() => {
  void store.state.sceneVersion
  const node = store.graph.getNode(nodeId)
  return node && scriptOfNode(node)
})
const state = computed(() => store.scriptRuntimeStates.get(nodeId))
const editable = computed(
  () =>
    active.value &&
    retained?.value !== false &&
    !store.state.readOnly &&
    getNodeEditCapability(store.graph, nodeId).editable
)
const canConvert = computed(() => {
  void store.state.sceneVersion
  const node = store.graph.getNode(nodeId)
  return (
    editable.value &&
    !state.value?.loading &&
    !state.value?.error &&
    !!node &&
    (!definition.value?.uri || hasCurrentScriptOutput(store.graph, node))
  )
})
const path = ref('')
const error = ref('')
const editingId = ref<string | null>(null)
let pathTarget: ReturnType<typeof pickTarget> | null = null
function beginPath() {
  editingId.value = nodeId
  pathTarget = pickTarget()
}
function cancelPath() {
  editingId.value = null
  pathTarget = null
  path.value = definition.value?.uri ?? ''
}
watch(
  () => definition.value?.uri,
  (uri) => {
    if (!editingId.value) path.value = uri ?? ''
  },
  { immediate: true }
)
function commitPath() {
  const target = pathTarget
  editingId.value = null
  pathTarget = null
  if (!target?.current()) {
    path.value = definition.value?.uri ?? ''
    return
  }
  const uri = path.value.trim()
  if (uri !== definition.value?.uri) store.attachScriptSource(target.id, uri)
}
watch(
  () => [store.graph, nodeId, store.state.sceneVersion, retained?.value, editable.value],
  () => {
    if (pathTarget && !pathTarget.current()) cancelPath()
  },
  { flush: 'sync' }
)
let pickVersion = 0
function pickTarget() {
  const graph = store.graph
  const id = nodeId
  const node = graph.getNode(id)
  const definition = node && scriptOfNode(node)
  const documentPath = store.getDocumentFilePath()
  const version = ++pickVersion
  return {
    id,
    documentPath,
    current: () =>
      editable.value &&
      version === pickVersion &&
      store.graph === graph &&
      graph.getNode(id) === node &&
      store.getDocumentFilePath() === documentPath &&
      !!node &&
      !!definition &&
      isEqual(scriptOfNode(node), definition)
  }
}
let pendingPick: ReturnType<typeof pickTarget> | null = null
const dialog = useFileDialog({
  accept: '.js,text/javascript,application/javascript',
  multiple: false
})
dialog.onChange(async (files) => {
  const target = pendingPick
  pendingPick = null
  const file = files?.[0]
  if (!file || !target?.current()) return
  try {
    if (file.size > 256_000) throw new Error('Script source is too large.')
    const source = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer())
    if (!target.current()) return
    store.attachScriptSource(target.id, file.name, source)
    error.value = ''
  } catch (failure) {
    if (target.current()) error.value = failure instanceof Error ? failure.message : String(failure)
  }
})
async function chooseFile() {
  const target = pickTarget()
  if (!isTauri()) {
    pendingPick = target
    dialog.open()
    return
  }
  try {
    const { open } = await import('@tauri-apps/plugin-dialog')
    if (!target.current()) return
    const chosen = await open({
      multiple: false,
      filters: [{ name: 'JavaScript', extensions: ['js'] }]
    })
    if (typeof chosen !== 'string' || !target.current()) return
    let uri = chosen
    if (target.documentPath) {
      const local = relative(dirname(target.documentPath), chosen)
      const contained = await documentSourceFilePath(local, target.documentPath, false)
      if (!target.current()) return
      if (contained) uri = local
    }
    if (!target.current()) return
    store.attachScriptSource(target.id, uri)
    error.value = ''
  } catch (failure) {
    if (target.current()) error.value = failure instanceof Error ? failure.message : String(failure)
  }
}
async function reveal() {
  try {
    const local = await documentSourceFilePath(
      definition.value?.uri ?? '',
      store.getDocumentFilePath(),
      true
    )
    if (!local) throw new Error('Choose a local script file first.')
    const { revealItemInDir } = await import('@tauri-apps/plugin-opener')
    await revealItemInDir(local)
  } catch (failure) {
    error.value = failure instanceof Error ? failure.message : String(failure)
  }
}
</script>

<template>
  <PanelSection v-if="definition" label="Script" :aria-busy="state?.loading ?? false">
    <div class="flex items-center gap-1">
      <AppInput
        v-model="path"
        aria-label="Script file"
        placeholder="path to .js file"
        tone="panel"
        size="xs"
        class="min-w-0 flex-1"
        :disabled="!editable"
        @focus="beginPath"
        @input="!pathTarget && beginPath()"
        @keydown.esc="cancelPath"
        @blur="cancelPath"
        @change="commitPath"
        @enter="commitPath"
      />
      <IconButton label="Choose script file" :disabled="!editable" @click="chooseFile">
        <icon-lucide-folder-open class="size-3.5" />
      </IconButton>
      <IconButton v-if="definition.uri && isTauri()" label="Reveal script file" @click="reveal">
        <icon-lucide-file-search class="size-3.5" />
      </IconButton>
    </div>
    <div class="mt-2 flex flex-col gap-2">
      <ScriptInputControl
        v-for="input in state?.definitions"
        :key="input.name"
        :node-id="nodeId"
        :input="input"
      />
      <AppButton
        variant="soft"
        size="xs"
        :disabled="!canConvert"
        @click="store.convertScriptToLayers(nodeId)"
      >
        Convert to layers
      </AppButton>
      <p v-if="!definition.uri" class="text-[11px] text-muted">
        Ask the agent to create a script, or choose a JavaScript file.
      </p>
      <AppAlert
        v-if="error || state?.error"
        tone="error"
        heading="Script could not run"
        :description="error || state?.error"
      />
    </div>
  </PanelSection>
</template>
