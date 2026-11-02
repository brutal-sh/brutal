<script setup lang="ts">
import { SplitterGroup, SplitterPanel, SplitterResizeHandle, ToolbarButton } from 'reka-ui'
import { tv } from 'tailwind-variants'
import { computed, ref, useTemplateRef } from 'vue'

import { IS_TAURI } from '@open-pencil/core/constants'
import { formatShortcut } from '@open-pencil/vue/editor/commands'
import { useViewportKind } from '@open-pencil/vue/editor/viewport-kind'
import { useI18n } from '@open-pencil/vue/i18n'

import { useAIChat } from '@/app/ai/chat/use'
import { provideTabEditorStore } from '@/app/editor/active-store'
import { openVariablesDialog } from '@/app/editor/tokens/dialog'
import { consumeHomeBrowserRequest } from '@/app/home/creation'
import { appRuntimeConfig } from '@/app/runtime/config'
import { loadEditorLayout, saveEditorLayout } from '@/app/shell/layout-storage'
import { appMenuShortcut } from '@/app/shell/menu/shortcut'
import type { Tab } from '@/app/tabs'
import BrowserPreviewControl from '@/components/browser-preview/BrowserPreviewControl.vue'
import CanvasSplitRoot from '@/components/canvas/CanvasSplitRoot.vue'
import CollabPanel from '@/components/collab-panel/CollabPanel.vue'
import ActiveRoomOverlay from '@/components/collab-room/ActiveRoomOverlay.vue'
import { useRoomActions } from '@/components/collab-room/useRoomActions'
import CommentDeleteDialog from '@/components/comments/CommentDeleteDialog.vue'
import FindLayersControl from '@/components/editor/FindLayersControl.vue'
import WorkspaceSidebar from '@/components/editor/WorkspaceSidebar.vue'
import ZoomDropdown from '@/components/editor/ZoomDropdown.vue'
import EditorCanvas from '@/components/EditorCanvas.vue'
import MobileDrawer from '@/components/MobileDrawer.vue'
import MobileHud from '@/components/MobileHud/MobileHud.vue'
import PresentationControl from '@/components/presentation/PresentationControl.vue'
import PropertiesPanel from '@/components/PropertiesPanel.vue'
import StatusesDialog from '@/components/statuses/StatusesDialog.vue'
import EditorToolbar from '@/components/toolbar/EditorToolbar.vue'
import IconButton from '@/components/ui/button/IconButton.vue'
import VariablesDialog from '@/components/variables/VariablesDialog.vue'
import splitterTheme from '@/theme/splitter'

import WorkspacePill from './WorkspacePill.vue'

const emit = defineEmits<{ openCommandPalette: []; headerWidth: [width: number] }>()
const showChrome = appRuntimeConfig.showChrome
/**
 * The document tab this workspace edits. WorkspaceView keys the workspace by tab, so the tab and
 * its store are fixed for its lifetime, and its editor UI stays bound to that document rather
 * than following the active tab to the next document when this one closes.
 */
const { tab } = defineProps<{ tab: Tab }>()
const store = tab.store
provideTabEditorStore(store)
const { isMobile } = useViewportKind()
const initialEditorLayout = loadEditorLayout()
const inspectorPinned = ref(false)
const browserOpen = ref(consumeHomeBrowserRequest(store))
const canvasHost = useTemplateRef<HTMLElement>('canvasHost')
const sidebar = useTemplateRef<InstanceType<typeof SplitterPanel>>('sidebar')
function toggleSidebar() {
  if (sidebar.value?.isCollapsed) sidebar.value.expand()
  else sidebar.value?.collapse()
}
const { activeTab, advancedProperties } = useAIChat()
const inspectorVisible = computed(
  () =>
    inspectorPinned.value ||
    advancedProperties.value ||
    store.state.selectedIds.size > 0 ||
    activeTab.value === 'code' ||
    activeTab.value === 'lint'
)
function rememberLayout(layout: number[]) {
  emit('headerWidth', layout.length === 3 ? (layout[0] ?? 0) + (layout[1] ?? 0) : 100)
  if (layout.length === 2) saveEditorLayout([layout[0] ?? 26, (layout[1] ?? 74) - 20, 20])
}
function zoom(delta: number) {
  const center = store.viewportCanvasCenter()
  store.applyZoom(delta, center.x, center.y)
}
const horizontalSplitterStyles = tv(splitterTheme)({ direction: 'horizontal' })
/** One canvas previewing takes the whole window, in the canvas-only layout; split view keeps panels. */
const playingAlone = computed(() => store.state.play !== null && store.visiblePaneCount.value <= 1)
const { editor } = useI18n()
// Until a room's document arrives there is nothing to edit, so its screen replaces the editor.
const { pending: roomPending } = useRoomActions()
</script>

<template>
  <div v-if="roomPending" :key="'room-' + tab.id" class="relative flex flex-1 overflow-hidden">
    <ActiveRoomOverlay />
  </div>

  <SplitterGroup
    v-else-if="!isMobile && showChrome && store.state.showUI && !playingAlone"
    :key="tab.id"
    direction="horizontal"
    class="relative min-h-0 flex-1 overflow-hidden p-2"
    @layout="rememberLayout"
  >
    <SplitterPanel
      id="layers"
      ref="sidebar"
      :collapsible="true"
      :collapsed-size="0"
      :default-size="initialEditorLayout[0]"
      :min-size="18"
      :max-size="40"
      class="flex min-w-0 pt-12"
    >
      <WorkspaceSidebar />
    </SplitterPanel>
    <SplitterResizeHandle
      data-test-id="left-splitter-handle"
      :class="horizontalSplitterStyles.handle()"
    >
      <div class="h-full w-2" />
    </SplitterResizeHandle>
    <SplitterPanel
      id="canvas"
      :default-size="100 - (initialEditorLayout[0] ?? 26)"
      :min-size="30"
      class="flex"
    >
      <div ref="canvasHost" class="relative flex min-w-0 flex-1">
        <CanvasSplitRoot />
        <ActiveRoomOverlay />
        <div
          class="absolute top-14 left-2 z-10 size-9 rounded-full border border-island-border bg-panel p-[3px]"
        >
          <IconButton label="Toggle sidebar" size="sm" @click="toggleSidebar">
            <icon-lucide-panel-left class="size-4" />
          </IconButton>
        </div>
        <EditorToolbar>
          <template #afterTool="{ tool }">
            <ToolbarButton v-if="tool === 'STICKY' && IS_TAURI" as-child>
              <IconButton label="Browser" size="md" class="size-7" @click="browserOpen = true"
                ><icon-lucide-globe class="size-4"
              /></IconButton>
            </ToolbarButton>
          </template>
          <template #default>
            <ToolbarButton as-child>
              <IconButton
                label="Variables"
                size="md"
                class="size-7"
                @click="openVariablesDialog(store)"
                ><icon-lucide-diamond class="size-4"
              /></IconButton>
            </ToolbarButton>
            <FindLayersControl :anchor="canvasHost" />
          </template>
          <template #after>
            <div class="size-9 rounded-full border border-island-border bg-panel p-[3px]">
              <IconButton label="Command palette" size="sm" @click="emit('openCommandPalette')">
                <icon-lucide-ellipsis class="size-4" />
              </IconButton>
            </div>
          </template>
        </EditorToolbar>
        <div
          data-canvas-obstacle
          class="absolute top-0 right-0 z-20 flex h-[42px] items-center gap-1 rounded-full border border-island-border bg-panel px-2"
        >
          <CollabPanel class="min-w-0" />
          <PresentationControl />
          <IconButton
            v-if="IS_TAURI"
            label="Browser preview"
            data-test-id="browser-preview-open"
            size="sm"
            @click="browserOpen = true"
          >
            <icon-lucide-globe class="size-4" />
          </IconButton>
          <IconButton
            label="Toggle inspector"
            size="sm"
            :toggle="true"
            :active="inspectorPinned"
            @click="inspectorPinned = !inspectorPinned"
          >
            <icon-lucide-panel-right class="size-4" />
          </IconButton>
          <IconButton
            :label="
              editor.startPreview({
                shortcut: formatShortcut(appMenuShortcut('toggle-preview')) ?? ''
              })
            "
            data-test-id="editor-start-preview"
            @click="store.startPlay()"
          >
            <icon-lucide-play class="size-3.5" />
          </IconButton>
        </div>
        <div
          v-show="inspectorVisible"
          data-canvas-obstacle
          class="absolute top-14 right-2 bottom-2 z-10 flex w-[220px] flex-col overflow-hidden rounded-[14px] border border-island-border bg-panel shadow-lg"
        >
          <PropertiesPanel :agent-on-left="true" />
        </div>
        <div
          data-canvas-obstacle
          class="absolute bottom-0 z-10 flex items-center gap-2 rounded-full border border-island-border bg-panel px-2 py-1"
          :class="inspectorVisible ? 'right-[236px]' : 'right-0'"
        >
          <IconButton label="Zoom out" size="sm" @click="zoom(100)"
            ><icon-lucide-minus class="size-4"
          /></IconButton>
          <ZoomDropdown />
          <IconButton label="Zoom in" size="sm" @click="zoom(-100)"
            ><icon-lucide-plus class="size-4"
          /></IconButton>
        </div>
      </div>
    </SplitterPanel>
    <SplitterResizeHandle v-if="browserOpen" :class="horizontalSplitterStyles.handle()">
      <div :class="horizontalSplitterStyles.divider()" />
    </SplitterResizeHandle>
    <SplitterPanel
      v-if="browserOpen"
      id="browser"
      :default-size="32"
      :min-size="20"
      :max-size="60"
      class="ml-2 flex min-w-0 flex-col overflow-hidden rounded-[20px] border border-island-border bg-panel"
    >
      <BrowserPreviewControl v-model:open="browserOpen" />
    </SplitterPanel>
  </SplitterGroup>

  <div
    v-else-if="isMobile && showChrome && store.state.showUI"
    :key="'mobile-' + tab.id"
    class="flex flex-1 overflow-hidden"
  >
    <div class="relative flex min-w-0 flex-1">
      <EditorCanvas />
      <ActiveRoomOverlay />
      <MobileHud />
      <EditorToolbar />
    </div>
    <MobileDrawer />
  </div>

  <div v-else-if="showChrome" :key="'collapsed-' + tab.id" class="flex flex-1 overflow-hidden">
    <div class="relative flex min-w-0 flex-1">
      <EditorCanvas />
      <ActiveRoomOverlay />
      <WorkspacePill
        v-if="!isMobile && playingAlone"
        mode="preview"
        :document-name="store.state.documentName"
        :shortcut="formatShortcut(appMenuShortcut('toggle-preview')) ?? ''"
        @reset="store.resetPlay()"
        @leave="store.stopPlay()"
      />
      <WorkspacePill
        v-else-if="!isMobile"
        mode="collapsed"
        :document-name="store.state.documentName"
        :shortcut="formatShortcut(appMenuShortcut('toggle-ui')) ?? ''"
        @show-ui="store.state.showUI = true"
      />
    </div>
  </div>

  <div v-else :key="'bare-' + tab.id" class="flex flex-1 overflow-hidden">
    <div class="relative flex min-w-0 flex-1">
      <EditorCanvas />
      <ActiveRoomOverlay />
    </div>
  </div>

  <VariablesDialog />
  <StatusesDialog />
  <CommentDeleteDialog />
</template>
