<script setup lang="ts">
import { useFileDialog } from '@vueuse/core'
import { computed, onScopeDispose, ref, watch } from 'vue'

import { colorToHex8, parseColor } from '@open-pencil/scene-graph/color'
import {
  fragmentShaderPreset,
  fragmentShaderOf,
  fragmentUniforms,
  shaderOfPaint,
  MAX_FRAGMENT_SOURCE_LENGTH,
  MAX_FRAGMENT_ERROR_LENGTH,
  type FragmentShader,
  type FragmentUniform,
  type ShaderPreset,
  type ShaderUniformValue
} from '@open-pencil/scene-graph/shaders'
import { useI18n } from '@open-pencil/vue/i18n'

import {
  fragmentSourceFilePath,
  loadFragmentSource,
  validateFragmentSource
} from '@/app/document/shaders/source'
import { useEditorStore } from '@/app/editor/active-store'
import { isTauri } from '@/app/tauri/env'
import ColorInput from '@/components/ColorPicker/ColorInput.vue'
import NumberField from '@/components/inputs/NumberField.vue'
import AppButton from '@/components/ui/button/AppButton.vue'
import IconButton from '@/components/ui/button/IconButton.vue'
import AppInput from '@/components/ui/input/AppInput.vue'
import Tip from '@/components/ui/overlay/Tip.vue'
import PanelFieldGroup from '@/components/ui/panel/PanelFieldGroup.vue'

const { shader, image } = defineProps<{ shader: FragmentShader; image: string }>()
const emit = defineEmits<{
  update: [preset: ShaderPreset]
  preview: [preset: ShaderPreset]
  commit: []
  cancel: []
}>()
const { panels } = useI18n()
const store = useEditorStore()
const path = ref(shader.url)
const error = ref('')
const loading = ref(false)
const sourceError = computed(() => store.shaderSourceErrors.get(shader.url))
const usedSources = computed(() => {
  void store.state.sceneVersion
  const sources = new Map<string, FragmentShader>()
  for (const node of store.graph.getAllNodes())
    for (const paint of [...node.fills, ...node.strokes]) {
      const shaderPaint = shaderOfPaint(node, paint)
      const source = shaderPaint && fragmentShaderOf(shaderPaint.preset)
      if (source?.url) sources.set(source.url, source)
    }
  return [...store.shaderSourceOrder].flatMap((url) => sources.get(url) ?? [])
})
const numberUI = {
  leading: 'px-2 [&_span]:text-xs',
  field: 'text-right text-xs',
  display: 'text-xs',
  value: 'text-right'
}
let request: AbortController | null = null
let requestPath = ''
const shaderKey = () =>
  JSON.stringify([image, shader.url, shader.source, shader.error, shader.uniforms])
watch(shaderKey, () => {
  request?.abort()
  path.value = shader.url
  error.value = ''
})
watch(path, (value) => {
  if (value.trim() !== requestPath) request?.abort()
})
onScopeDispose(() => request?.abort())
const metadata = computed(() => {
  try {
    return {
      controls: fragmentUniforms(shader.source).filter((control) => !control.automatic),
      error: ''
    }
  } catch (failure) {
    return { controls: [], error: failure instanceof Error ? failure.message : String(failure) }
  }
})
const sourceDiagnostic = computed(
  () =>
    shader.error ||
    metadata.value.error ||
    sourceError.value ||
    (shader.url.trim() && !shader.source.trim() ? panels.value.shaderLoadFailed : '')
)
const displayError = computed(() => error.value || sourceDiagnostic.value)

async function apply(load: (signal: AbortSignal) => Promise<FragmentShader>) {
  request?.abort()
  const current = new AbortController()
  const expected = shaderKey()
  const graph = store.graph
  const documentPath = store.getDocumentFilePath()
  const target = path.value.trim()
  requestPath = target
  const ownsPaint = () =>
    !current.signal.aborted &&
    store.graph === graph &&
    store.getDocumentFilePath() === documentPath &&
    shaderKey() === expected
  request = current
  loading.value = true
  error.value = ''
  try {
    const next = await load(current.signal)
    if (next.url === shader.url) next.uniforms = structuredClone(shader.uniforms)
    await validateFragmentSource(next)
    if (ownsPaint()) {
      path.value = next.url
      if (next.url !== shader.url) emit('update', fragmentShaderPreset(next))
      store.watchShaderSource(next)
    }
  } catch (failure) {
    if (ownsPaint()) {
      const message =
        (failure instanceof Error ? failure.message : String(failure)).slice(
          0,
          MAX_FRAGMENT_ERROR_LENGTH
        ) || 'Shader source could not be loaded.'
      error.value = message
      if (target && target.length <= 16384) {
        const failed: FragmentShader = {
          url: target,
          source: shader.source,
          uniforms: target === shader.url ? structuredClone(shader.uniforms) : {},
          error: message
        }
        if (failed.url !== shader.url) emit('update', fragmentShaderPreset(failed))
        store.watchShaderSource(failed)
      }
    }
  } finally {
    if (request === current) loading.value = false
  }
}
function loadPath() {
  if (!path.value.trim()) {
    request?.abort()
    loading.value = false
    error.value = ''
    emit('update', fragmentShaderPreset({ url: '', source: '', uniforms: {} }))
    return
  }
  return apply((signal) => loadFragmentSource(path.value, store.getDocumentFilePath(), signal))
}
function useSource(source: FragmentShader) {
  path.value = source.url
  // A browser-uploaded file has no readable path; the document retains its validated source.
  return isTauri() || /^https?:/i.test(source.url)
    ? loadPath()
    : apply(async () => ({ ...source, uniforms: {} }))
}
async function revealSource() {
  try {
    const local = await fragmentSourceFilePath(shader.url, store.getDocumentFilePath(), true)
    if (!local) throw new Error('This shader has no local file to reveal.')
    const { revealItemInDir } = await import('@tauri-apps/plugin-opener')
    await revealItemInDir(local)
  } catch (failure) {
    error.value = failure instanceof Error ? failure.message : String(failure)
  }
}
const dialog = useFileDialog({
  accept: '.glsl,.frag,text/plain',
  multiple: false
})
dialog.onChange((files) => {
  const file = files?.[0]
  if (!file) return
  path.value = file.name
  void apply(async () => {
    if (file.size > MAX_FRAGMENT_SOURCE_LENGTH) throw new Error('Shader source is too large.')
    const source = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer())
    return { url: file.name, source, uniforms: {} }
  })
})
async function pickFile() {
  if (!isTauri()) {
    dialog.open()
    return
  }
  try {
    const { open } = await import('@tauri-apps/plugin-dialog')
    const chosen = await open({
      multiple: false,
      filters: [{ name: 'GLSL', extensions: ['glsl', 'frag'] }]
    })
    if (typeof chosen === 'string') {
      path.value = chosen
      await loadPath()
    }
  } catch (failure) {
    error.value = failure instanceof Error ? failure.message : String(failure)
  }
}
function value(control: FragmentUniform) {
  return shader.uniforms[control.name] ?? control.value
}
function numbers(control: FragmentUniform): number[] {
  const current = value(control)
  return Array.isArray(current) ? current : [typeof current === 'number' ? current : 0]
}
function set(control: FragmentUniform, next: ShaderUniformValue, preview = false) {
  const preset = fragmentShaderPreset({
    ...shader,
    uniforms: { ...shader.uniforms, [control.name]: next }
  })
  if (preview) emit('preview', preset)
  else emit('update', preset)
}
function setNumber(control: FragmentUniform, at: number, next: number) {
  if (control.size === 1) {
    set(control, control.integer ? Math.round(next) : next, true)
    return
  }
  const vector = [...numbers(control)]
  vector[at] = control.integer ? Math.round(next) : next
  set(control, vector, true)
}
</script>

<template>
  <div class="flex flex-col gap-2" data-slot="shader-source-picker">
    <div class="flex items-center gap-1">
      <AppInput
        v-model="path"
        class="h-6 min-w-0 flex-1 text-xs"
        tone="panel"
        :aria-label="panels.shaderSourcePath"
        :placeholder="panels.shaderSourcePath"
        @enter="loadPath"
        @change="loadPath"
      />
      <IconButton
        v-if="shader.source && !/^https?:/i.test(shader.url)"
        class="rounded-md bg-panel-field"
        :label="panels.revealShaderFile"
        :disabled="loading || !isTauri()"
        @click="revealSource"
        ><icon-lucide-folder-search class="size-3.5"
      /></IconButton>
      <IconButton
        :label="panels.chooseShaderFile"
        class="rounded-md bg-panel-field"
        :disabled="loading"
        @click="pickFile"
        ><icon-lucide-upload class="size-3.5"
      /></IconButton>
    </div>
    <div v-if="usedSources.length" class="flex flex-col gap-1" data-slot="shader-used-sources">
      <p class="mb-1 text-xs text-muted">{{ panels.shaderUsedInFile }}</p>
      <Tip v-for="source in usedSources" :key="source.url" :label="source.url" as-child
        ><AppButton
          :disabled="loading"
          class="h-6 w-full justify-start truncate bg-panel-field px-2 text-xs"
          @click="useSource(source)"
          >{{ source.url }}</AppButton
        ></Tip
      >
    </div>
    <p
      v-if="displayError"
      role="alert"
      :aria-label="panels.shaderLoadFailed"
      class="m-0 break-words whitespace-pre-wrap text-xs text-error"
    >
      {{ displayError }}
    </p>
    <div
      v-if="metadata.controls.length && !sourceDiagnostic"
      class="mt-1 flex flex-col gap-2 border-t border-border pt-2"
      :inert="loading || undefined"
    >
      <template v-for="control in metadata.controls" :key="control.name">
        <PanelFieldGroup
          v-if="control.color"
          :label="control.label"
          :ui="{ label: 'text-xs leading-4' }"
        >
          <ColorInput
            class="h-6 rounded bg-panel-field px-1"
            :color="parseColor(String(value(control)))"
            editable
            @update="set(control, colorToHex8($event))"
          />
        </PanelFieldGroup>
        <PanelFieldGroup
          v-else-if="control.size > 1"
          :label="control.label"
          :ui="{ label: 'text-xs leading-4' }"
        >
          <div class="flex gap-1">
            <NumberField
              v-for="at in control.size"
              :key="at"
              :model-value="numbers(control)[at - 1] ?? 0"
              :icon="['x', 'y', 'z', 'w'][at - 1]"
              :aria-label="`${control.label} ${['X', 'Y', 'Z', 'W'][at - 1]}`"
              :step="control.integer ? 1 : 0.01"
              :inherit-binding="false"
              :ui="numberUI"
              @update:model-value="setNumber(control, at - 1, $event)"
              @commit="emit('commit')"
              @cancel="emit('cancel')"
            />
          </div>
        </PanelFieldGroup>
        <NumberField
          v-else
          :model-value="numbers(control)[0]"
          :label="control.label"
          :min="control.min"
          :max="control.max"
          :scrub-mode="
            control.min !== undefined && control.max !== undefined ? 'range' : 'relative'
          "
          :step="control.integer ? 1 : 0.1"
          :inherit-binding="false"
          :ui="numberUI"
          @update:model-value="setNumber(control, 0, $event)"
          @commit="emit('commit')"
          @cancel="emit('cancel')"
        >
          <template #display="display">
            <span class="min-w-0 flex-1 text-right">{{
              Number(display.value).toFixed(control.integer ? 0 : 1)
            }}</span>
          </template>
        </NumberField>
      </template>
    </div>
    <p
      v-if="!shader.source && !sourceDiagnostic && !usedSources.length"
      class="m-0 text-xs text-muted"
    >
      {{ panels.shaderSourceTip }}
    </p>
  </div>
</template>
