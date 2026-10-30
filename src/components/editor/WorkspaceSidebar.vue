<script setup lang="ts">
import { TabsContent, TabsRoot } from 'reka-ui'
import { ref, watch } from 'vue'

import { useSceneComputed } from '@open-pencil/vue/internal/scene-computed'

import { useAIChat } from '@/app/ai/chat/use'
import { useEditorStore } from '@/app/editor/active-store'
import { collectPresentationSlides } from '@/app/presentation/slides'
import AssetsPanel from '@/components/assets-panel/AssetsPanel.vue'
import ChatPanel from '@/components/chat/ChatPanel.vue'
import LayersPanel from '@/components/LayersPanel.vue'
import LibraryManagerDialog from '@/components/libraries/LibraryManagerDialog.vue'
import AppPlaceholder from '@/components/ui/feedback/AppPlaceholder.vue'

import WorkspaceSidebarNavigation from './WorkspaceSidebarNavigation.vue'

const store = useEditorStore()
const panel = ref('agent')
const librariesOpen = ref(false)
const { activeTab } = useAIChat()
const slides = useSceneComputed(() =>
  collectPresentationSlides(store.graph, store.state.currentPageId)
)

// Existing Ask AI actions still reveal the agent, now on the left.
watch(panel, (value) => {
  if (value !== 'agent' && activeTab.value === 'ai') activeTab.value = 'design'
})
watch(activeTab, (tab) => {
  if (tab === 'ai') panel.value = 'agent'
})

function showSlide(id: string) {
  store.select([id])
  store.zoomToSelection()
}
</script>

<template>
  <TabsRoot
    v-model="panel"
    class="flex min-h-0 min-w-0 flex-1 flex-col"
    aria-label="Workspace sidebar"
  >
    <ChatPanel docked :active-panel="panel">
      <template #navigation>
        <WorkspaceSidebarNavigation @libraries="librariesOpen = true" />
      </template>
      <template #panel>
        <TabsContent
          value="layers"
          :force-mount="true"
          :hidden="panel !== 'layers'"
          class="flex min-h-0 flex-1 flex-col"
          ><LayersPanel embedded
        /></TabsContent>
        <TabsContent value="components" class="flex min-h-0 flex-1 flex-col"
          ><AssetsPanel
        /></TabsContent>
        <TabsContent value="slides" class="flex min-h-0 flex-1 flex-col">
          <div class="flex items-center justify-between border-b border-border px-3 pb-3">
            <span class="text-xs text-muted">{{ slides.length }} slides</span>
          </div>
          <AppPlaceholder
            v-if="!slides.length"
            label="No slides on this page"
            description="Add a frame to begin."
          />
          <div v-else class="min-h-0 flex-1 overflow-y-auto p-2">
            <button
              v-for="(slide, index) in slides"
              :key="slide.id"
              class="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-xs hover:bg-hover focus-visible:outline-panel-focus"
              @click="showSlide(slide.id)"
            >
              <span class="text-muted">{{ index + 1 }}</span>
              <icon-lucide-presentation class="size-4 text-muted" />
              <span class="truncate">{{ slide.name }}</span>
            </button>
          </div>
        </TabsContent>
      </template>
    </ChatPanel>
    <LibraryManagerDialog v-model="librariesOpen" />
  </TabsRoot>
</template>
