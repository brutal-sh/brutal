<script setup lang="ts">
import { useClipboard, useLocalStorage } from '@vueuse/core'
import { basename, dirname, isAbsolute, join } from 'pathe'
import { filename } from 'pathe/utils'
import { PopoverRoot, PopoverTrigger, PopoverContent, PopoverPortal } from 'reka-ui'
import { computed, inject, ref } from 'vue'

import { IS_TAURI } from '@open-pencil/core/constants'
import type { HTMLExportOptions } from '@open-pencil/core/io'
import { renderNodesToHTML } from '@open-pencil/core/io/formats/html'
import { useViewportKind } from '@open-pencil/vue/editor/viewport-kind'
import { useRetainedPopup } from '@open-pencil/vue/lifecycle/retention'

import { openBrowserExportKey, toggleBrowserPreviewKey } from '@/app/browser-preview/context'
import { useEditorStore } from '@/app/editor/active-store'
import AppButton from '@/components/ui/button/AppButton.vue'
import IconButton from '@/components/ui/button/IconButton.vue'
import AppAlert from '@/components/ui/feedback/AppAlert.vue'
import { usePopoverUI } from '@/components/ui/overlay/popover'
import PanelSection from '@/components/ui/panel/PanelSection.vue'
import AppSelect from '@/components/ui/select/AppSelect.vue'
import AppCheckbox from '@/components/ui/toggle/AppCheckbox.vue'

const { nodeIds } = defineProps<{ nodeIds: readonly string[] }>()
const store = useEditorStore()
const { isMobile } = useViewportKind()
const toggleBrowserPreview = inject(toggleBrowserPreviewKey, undefined)
const openBrowserExport = inject(openBrowserExportKey, undefined)
const style = useLocalStorage('open-pen:html-style', 'tailwind')
const assets = useLocalStorage('open-pen:html-assets', 'inline')
const assetMode = computed({
  get: (): NonNullable<HTMLExportOptions['assets']> =>
    IS_TAURI && assets.value === 'external'
      ? 'relative'
      : (assetModes.find((mode) => mode.value === assets.value)?.value ?? 'inline'),
  set: (value: string) => {
    assets.value = value
  }
})
const scaffold = useLocalStorage('open-pen:html-scaffold', true)
const center = useLocalStorage('open-pen:html-center', true)
const names = useLocalStorage('open-pen:html-layer-names', true)
const ids = useLocalStorage('open-pen:html-layer-ids', false)
const askWhere = useLocalStorage('open-pen:html-ask-where', false)
const openAfterExport = useLocalStorage('open-pen:html-open-after-export', true)
const { open: settingsOpen, portalActive } = useRetainedPopup()
const popover = usePopoverUI({ content: 'w-[264px] p-3' })
const assetModes: { value: NonNullable<HTMLExportOptions['assets']>; label: string }[] = IS_TAURI
  ? [
      { value: 'relative', label: 'Relative paths (in the repo...)' },
      { value: 'absolute', label: 'Absolute paths (on the disk)' },
      { value: 'inline', label: 'Embed assets (self-contained document)' }
    ]
  : [
      { value: 'inline', label: 'Embed assets (self-contained document)' },
      { value: 'external', label: 'Relative paths (ZIP bundle)' }
    ]
const busy = ref(false)
const error = ref('')
const { copy, copied } = useClipboard({ copiedDuring: 1500 })
const formats = [
  { value: 'tailwind', label: 'HTML + Tailwind' },
  { value: 'inline', label: 'HTML + CSS' }
]
async function output(save: boolean) {
  if (busy.value || !nodeIds.length) return
  const targetIds = [...nodeIds]
  const selectedAssets = assetMode.value
  const previewAfterSave = openAfterExport.value && selectedAssets !== 'external'
  const sourcePath = store.getDocumentFilePath()
  const fileName = `${(sourcePath ? filename(sourcePath) : basename(store.state.documentName)) || 'Untitled'}-export.html`
  const nativePath =
    IS_TAURI && !askWhere.value && sourcePath && isAbsolute(sourcePath)
      ? join(dirname(sourcePath), fileName)
      : undefined
  busy.value = true
  error.value = ''
  const options = {
    html: scaffold.value ? 'standalone' : 'fragment',
    assets: selectedAssets,
    documentPath: sourcePath ?? undefined,
    center: center.value,
    includeLayerNames: names.value,
    includeLayerIds: ids.value,
    style: style.value === 'tailwind' ? 'tailwind' : 'inline'
  } as const
  try {
    if (save) {
      const result = await store.exportTarget(
        { scope: 'selection', nodeIds: targetIds },
        'html',
        options,
        {
          fileName,
          nativePath
        }
      )
      if (result.saved && result.nativePath && previewAfterSave) {
        try {
          await openBrowserExport?.(result.nativePath)
        } catch {
          error.value = 'HTML saved, but its browser preview could not open. Try again.'
        }
      }
    } else await copy((await renderNodesToHTML(store.graph, targetIds, options)).html)
  } catch {
    error.value = 'Could not generate HTML. Try again.'
  } finally {
    busy.value = false
  }
}
</script>
<template>
  <PanelSection label="Code">
    <template #actions>
      <PopoverRoot v-model:open="settingsOpen">
        <PopoverTrigger as-child
          ><IconButton label="Code export settings"
            ><icon-lucide-settings class="size-3.5" /></IconButton
        ></PopoverTrigger>
        <PopoverPortal v-if="portalActive"
          ><PopoverContent
            side="left"
            align="end"
            :side-offset="20"
            :collision-padding="10"
            :class="popover.content"
            aria-label="Export Settings"
          >
            <h3 class="mb-2 text-xxs font-medium text-surface">Export Settings</h3>
            <p class="mb-1 text-xxs text-muted">Assets</p>
            <AppSelect v-model="assetMode" :options="assetModes" label="Select asset export mode" />
            <label class="mt-1.5 flex items-center gap-1 text-2xs text-surface"
              ><AppCheckbox v-model="scaffold" neutral ariaLabel="Include HTML scaffold" />Include
              HTML scaffold</label
            >
            <label class="mt-1.5 flex items-center gap-1 text-2xs text-surface"
              ><AppCheckbox v-model="center" neutral ariaLabel="Center body contents" />Center
              &lt;body&gt; contents</label
            >
            <label v-if="IS_TAURI" class="mt-1.5 flex items-center gap-1 text-2xs text-surface"
              ><AppCheckbox
                v-model="askWhere"
                neutral
                ariaLabel="Ask user where to export file"
              />Ask user where to export the file</label
            >
            <label
              v-if="IS_TAURI && openBrowserExport"
              class="mt-1.5 flex items-center gap-1 text-2xs text-surface"
              ><AppCheckbox
                v-model="openAfterExport"
                neutral
                ariaLabel="Open in Browser after Export"
              />Open in Browser after Export</label
            >
            <label class="mt-1.5 flex items-center gap-1 text-2xs text-surface"
              ><AppCheckbox v-model="names" neutral ariaLabel="Include layer names" />Include layer
              names</label
            >
            <label class="mt-1.5 flex items-center gap-1 text-2xs text-surface"
              ><AppCheckbox v-model="ids" neutral ariaLabel="Include layer IDs" />Include layer
              IDs</label
            >
          </PopoverContent></PopoverPortal
        >
      </PopoverRoot>
    </template>
    <AppSelect v-model="style" :options="formats" label="Select code export format" />
    <div class="mt-1.5 flex gap-1.5">
      <AppButton
        variant="soft"
        size="xs"
        class="flex-1 font-normal"
        :disabled="busy"
        @click="output(false)"
        >{{ copied ? 'Copied' : 'Copy HTML' }}</AppButton
      >
      <AppButton
        variant="soft"
        size="xs"
        class="flex-1 font-normal"
        :disabled="busy"
        @click="output(true)"
        >Export HTML</AppButton
      >
    </div>
    <AppButton
      v-if="IS_TAURI && !isMobile && toggleBrowserPreview"
      variant="soft"
      size="xs"
      class="mt-1.5 w-full font-normal"
      aria-label="Import Web via Browser"
      @click="toggleBrowserPreview"
      >Import Web via Browser</AppButton
    >
    <AppAlert v-if="error" tone="error" heading="Code export failed" :description="error" />
  </PanelSection>
</template>
