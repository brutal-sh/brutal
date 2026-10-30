<script setup lang="ts">
import { useFileDialog } from '@vueuse/core'
import { computed, onScopeDispose, ref, watch } from 'vue'

import { colorToHex8, parseColor } from '@open-pencil/scene-graph/color'
import {
  fragmentShaderPreset,
  fragmentUniforms,
  MAX_FRAGMENT_SOURCE_LENGTH,
  type FragmentShader,
  type FragmentUniform,
  type ShaderPreset,
  type ShaderUniformValue
} from '@open-pencil/scene-graph/shaders'
import { useI18n } from '@open-pencil/vue/i18n'

import { loadFragmentSource, validateFragmentSource } from '@/app/document/shaders/source'
import { useEditorStore } from '@/app/editor/active-store'
import { isTauri } from '@/app/tauri/env'
import ColorInput from '@/components/ColorPicker/ColorInput.vue'
import NumberField from '@/components/inputs/NumberField.vue'
import IconButton from '@/components/ui/button/IconButton.vue'
import AppAlert from '@/components/ui/feedback/AppAlert.vue'
import AppInput from '@/components/ui/input/AppInput.vue'
import PanelFieldGroup from '@/components/ui/panel/PanelFieldGroup.vue'

const { shader } = defineProps<{ shader: FragmentShader }>()
const emit = defineEmits<{ update: [preset: ShaderPreset] }>()
const { panels } = useI18n()
const store = useEditorStore()
const path = ref(shader.url)
const error = ref('')
const loading = ref(false)
let request: AbortController | null = null
watch(
  () => shader.url,
  (url) => {
    path.value = url
  }
)
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

async function apply(load: (signal: AbortSignal) => Promise<FragmentShader>) {
  request?.abort()
  const current = new AbortController()
  request = current
  loading.value = true
  error.value = ''
  try {
    const next = await load(current.signal)
    await validateFragmentSource(next)
    if (!current.signal.aborted) emit('update', fragmentShaderPreset(next))
  } catch (failure) {
    if (!current.signal.aborted)
      error.value = failure instanceof Error ? failure.message : String(failure)
  } finally {
    if (request === current) loading.value = false
  }
}
function loadPath() {
  return apply((signal) => loadFragmentSource(path.value, store.getDocumentFilePath(), signal))
}
const dialog = useFileDialog({
  accept: '.glsl,.frag,text/plain',
  multiple: false
})
dialog.onChange((files) => {
  const file = files?.[0]
  if (!file) return
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
function set(control: FragmentUniform, next: ShaderUniformValue) {
  emit(
    'update',
    fragmentShaderPreset({
      ...shader,
      uniforms: { ...shader.uniforms, [control.name]: next }
    })
  )
}
function setNumber(control: FragmentUniform, at: number, next: number) {
  if (control.size === 1) {
    set(control, control.integer ? Math.round(next) : next)
    return
  }
  const vector = [...numbers(control)]
  vector[at] = control.integer ? Math.round(next) : next
  set(control, vector)
}
</script>

<template>
  <div class="flex flex-col gap-2" data-slot="shader-source-picker">
    <div class="flex items-center gap-1">
      <AppInput
        v-model="path"
        class="min-w-0 flex-1"
        :aria-label="panels.shaderSourcePath"
        :placeholder="panels.shaderSourcePath"
        @enter="loadPath"
        @change="loadPath"
      />
      <IconButton :label="panels.chooseShaderFile" :disabled="loading" @click="pickFile"
        ><icon-lucide-folder-search class="size-3.5"
      /></IconButton>
      <IconButton
        v-if="shader.source"
        :label="panels.reloadShader"
        :disabled="loading"
        @click="loadPath"
        ><icon-lucide-refresh-cw class="size-3.5"
      /></IconButton>
    </div>
    <AppAlert
      v-if="error || metadata.error"
      tone="error"
      :heading="panels.shaderLoadFailed"
      :description="error || metadata.error"
    />
    <template v-for="control in metadata.controls" :key="control.name">
      <PanelFieldGroup v-if="control.color" :label="control.label">
        <ColorInput
          :color="parseColor(String(value(control)))"
          editable
          @update="set(control, colorToHex8($event))"
        />
      </PanelFieldGroup>
      <PanelFieldGroup v-else-if="control.size > 1" :label="control.label">
        <div class="flex gap-1">
          <NumberField
            v-for="at in control.size"
            :key="at"
            :model-value="numbers(control)[at - 1] ?? 0"
            :icon="['X', 'Y', 'Z', 'W'][at - 1]"
            :aria-label="`${control.label} ${['X', 'Y', 'Z', 'W'][at - 1]}`"
            :step="control.integer ? 1 : 0.01"
            :inherit-binding="false"
            @commit="setNumber(control, at - 1, $event)"
          />
        </div>
      </PanelFieldGroup>
      <NumberField
        v-else
        :model-value="numbers(control)[0]"
        :label="control.label"
        :min="control.min"
        :max="control.max"
        :step="control.integer ? 1 : 0.1"
        :inherit-binding="false"
        @commit="setNumber(control, 0, $event)"
      />
    </template>
    <p v-if="!shader.source" class="m-0 text-xs text-muted">
      {{ panels.shaderSourceTip }}
    </p>
  </div>
</template>
