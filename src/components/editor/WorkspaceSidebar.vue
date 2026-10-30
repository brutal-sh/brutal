<script setup lang="ts">
import { TabsContent, TabsRoot } from 'reka-ui'
import { ref, watch } from 'vue'

import { useAIChat } from '@/app/ai/chat/use'
import { useEditorStore } from '@/app/editor/active-store'
import AssetsPanel from '@/components/assets-panel/AssetsPanel.vue'
import ChatPanel from '@/components/chat/ChatPanel.vue'
import SlidesPanel from '@/components/editor/SlidesPanel.vue'
import LayersPanel from '@/components/LayersPanel.vue'
import LibrarySidebar from '@/components/libraries/LibrarySidebar.vue'

import WorkspaceSidebarNavigation from './WorkspaceSidebarNavigation.vue'

const panel = ref('agent')
const { activeTab } = useAIChat()
const store = useEditorStore()
watch(
  () => store.state.renameNodeId,
  (id) => {
    if (id) panel.value = 'layers'
  },
  { flush: 'sync' }
)
// Existing Ask AI actions still reveal the agent, now on the left.
watch(panel, (value) => {
  if (value !== 'agent' && activeTab.value === 'ai') activeTab.value = 'design'
})
watch(activeTab, (tab, previous) => {
  if (tab === 'ai') panel.value = 'agent'
  else if (tab === 'design' && previous === 'ai') panel.value = 'layers'
})
</script>

<template>
  <TabsRoot
    v-model="panel"
    class="flex min-h-0 min-w-0 flex-1 flex-col"
    aria-label="Workspace sidebar"
  >
    <ChatPanel docked :active-panel="panel">
      <template #navigation>
        <WorkspaceSidebarNavigation />
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
          ><AssetsPanel workspace
        /></TabsContent>
        <TabsContent value="slides" class="flex min-h-0 flex-1 flex-col">
          <SlidesPanel />
        </TabsContent>
        <TabsContent value="libraries" class="flex min-h-0 flex-1 flex-col"
          ><LibrarySidebar
        /></TabsContent>
      </template>
    </ChatPanel>
  </TabsRoot>
</template>
