<script setup lang="ts">
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuTrigger
} from 'reka-ui'
import { computed, ref } from 'vue'

import { useSceneComputed } from '@open-pencil/vue/internal/scene-computed'

import { useEditorStore } from '@/app/editor/active-store'
import { exportSlidesPDF } from '@/app/presentation/export'
import { collectPresentationSlides } from '@/app/presentation/slides'
import AssetThumbnail from '@/components/assets-panel/AssetThumbnail.vue'
import PresentationControl from '@/components/presentation/PresentationControl.vue'
import AppButton from '@/components/ui/button/AppButton.vue'
import AppAlert from '@/components/ui/feedback/AppAlert.vue'
import AppPlaceholder from '@/components/ui/feedback/AppPlaceholder.vue'
import { useMenuUI } from '@/components/ui/menu/menu'

const store = useEditorStore()
const slides = useSceneComputed(() =>
  collectPresentationSlides(store.graph, store.state.currentPageId)
)
const selected = computed(() =>
  slides.value.filter((slide) => store.state.selectedIds.has(slide.id))
)
const exporting = ref(false)
const error = ref('')
const menu = useMenuUI()
function showSlide(id: string, event: MouseEvent) {
  let ids = [id]
  if (event.metaKey || event.ctrlKey || event.shiftKey) {
    ids = store.state.selectedIds.has(id)
      ? [...store.state.selectedIds].filter((value) => value !== id)
      : [...store.state.selectedIds, id]
  }
  store.select(ids)
  store.zoomToSelection()
}
async function exportSlides(onlySelected: boolean) {
  const nodeIds = (onlySelected ? selected.value : slides.value).map((slide) => slide.id)
  if (!nodeIds.length || exporting.value) return
  exporting.value = true
  error.value = ''
  try {
    await exportSlidesPDF(store.graph, store.state.currentPageId, nodeIds)
  } catch {
    error.value = 'Try exporting the slides again.'
  } finally {
    exporting.value = false
  }
}
</script>
<template>
  <section aria-label="Slides" class="flex min-h-0 flex-1 flex-col">
    <AppAlert v-if="error" tone="error" heading="Could not export slides" :description="error" />
    <AppPlaceholder
      v-if="!slides.length"
      label="No slides on this page"
      description="Add a frame to begin."
    />
    <div v-else class="min-h-0 flex-1 overflow-y-auto px-3 pb-2">
      <button
        v-for="(slide, index) in slides"
        :key="slide.id"
        :aria-label="slide.name"
        :aria-pressed="store.state.selectedIds.has(slide.id)"
        class="relative mb-1 block w-full overflow-hidden rounded-xl border border-transparent bg-canvas/40 p-1 outline-none hover:bg-hover focus-visible:ring-2 focus-visible:ring-panel-focus aria-pressed:border-panel-focus"
        @click="showSlide(slide.id, $event)"
      >
        <AssetThumbnail
          :node-id="slide.id"
          :alt="slide.name"
          :size="360"
          fill
          :aspect-ratio="2.16"
        />
        <span
          class="absolute top-2 left-2 flex size-5 items-center justify-center rounded-full bg-canvas text-sm text-surface"
          >{{ index + 1 }}</span
        >
      </button>
    </div>
    <footer class="flex shrink-0 items-center justify-evenly border-t border-border p-2">
      <PresentationControl label />
      <DropdownMenuRoot>
        <DropdownMenuTrigger as-child
          ><AppButton :disabled="!slides.length || exporting" aria-label="Export PDF"
            >Export PDF <icon-lucide-chevron-down class="size-3" /></AppButton
        ></DropdownMenuTrigger>
        <DropdownMenuPortal
          ><DropdownMenuContent :class="menu.content" side="top">
            <DropdownMenuItem :class="menu.item" @select="exportSlides(false)"
              >Export all slides</DropdownMenuItem
            >
            <DropdownMenuItem
              :class="menu.item"
              :disabled="!selected.length"
              @select="exportSlides(true)"
              >Export selected slides ({{ selected.length }})</DropdownMenuItem
            >
          </DropdownMenuContent></DropdownMenuPortal
        >
      </DropdownMenuRoot>
    </footer>
  </section>
</template>
