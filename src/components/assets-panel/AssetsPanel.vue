<script setup lang="ts">
import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuPortal,
  ContextMenuRoot,
  ContextMenuTrigger
} from 'reka-ui'
import { computed, onMounted, ref, watch } from 'vue'

import { useEditorCommands } from '@open-pencil/vue/editor/commands'
import { useI18n } from '@open-pencil/vue/i18n'

import { useEditorStore } from '@/app/editor/active-store'
import { useLibraryService } from '@/app/libraries'
import { openExternalLink } from '@/app/shell/ui'
import AssetThumbnail from '@/components/assets-panel/AssetThumbnail.vue'
import { nodeIcon } from '@/components/icons'
import LibraryManagerDialog from '@/components/libraries/LibraryManagerDialog.vue'
import { useLibraryEntry } from '@/components/libraries/useLibraryEntry'
import AppButton from '@/components/ui/button/AppButton.vue'
import AppPlaceholder from '@/components/ui/feedback/AppPlaceholder.vue'
import AppInput from '@/components/ui/input/AppInput.vue'
import { useMenuUI } from '@/components/ui/menu/menu'
import MenuScrollArea from '@/components/ui/menu/MenuScrollArea.vue'
import { useHeldContent } from '@/components/ui/overlay/held'
import Tip from '@/components/ui/overlay/Tip.vue'
import SegmentedControl from '@/components/ui/select/SegmentedControl.vue'
import { ASSET_GRID_THUMBNAIL_SIZE, ASSET_LIST_THUMBNAIL_SIZE } from '@/constants'

import AssetsPanelDetails from './AssetsPanelDetails.vue'
import { useAssetCatalog, type AssetView } from './catalog'
import { useAssetInsertion } from './useAssetInsertion'
import { useAssetPreview } from './useAssetPreview'

const { workspace = false } = defineProps<{ workspace?: boolean }>()
const { getCommand, runCommand } = useEditorCommands()
const createComponent = getCommand('selection.createComponent')
const editor = useEditorStore()
const libraryService = useLibraryService()
const { panels, commands } = useI18n()
const query = ref('')
const assetView = ref<AssetView>('grid')
const detailsOpen = ref(false)
const {
  open: librariesOpen,
  initialSection: libraryInitialSection,
  updateCount: libraryUpdateCount,
  openManager: openLibraries
} = useLibraryEntry(editor, libraryService)
const selectedAssetId = ref<string | null>(null)
const insertButton = {
  color: 'neutral' as const,
  variant: 'ghost' as const,
  size: 'sm' as const,
  shape: 'square' as const
}
const contextMenu = useMenuUI({ content: 'min-w-44' })
const viewOptions = computed(() => [
  { value: 'grid', label: panels.value.gridView },
  { value: 'list', label: panels.value.listView }
])
const viewUI = { root: 'w-16', item: 'px-1' }

const { assets, filteredAssets, assetGroups } = useAssetCatalog(
  editor,
  libraryService,
  query,
  () => panels.value.page
)

const selectedAsset = computed(
  () => assets.value.find((asset) => asset.id === selectedAssetId.value) ?? null
)
// An asset deleted while its details are open closes them; they keep showing it as they fade.
const shownAsset = useHeldContent(selectedAsset)
watch(selectedAsset, (asset) => {
  if (!asset) detailsOpen.value = false
})

onMounted(() => {
  void libraryService.refresh(editor)
})

const { previewURL, previewLoading, openDetails } = useAssetPreview(
  editor,
  selectedAsset,
  selectedAssetId,
  detailsOpen
)

const { insertingAssetId, insertAsset, focusAsset, onAssetKeydown, onDragStart } =
  useAssetInsertion(editor, libraryService, openDetails)

async function insertSelectedAsset() {
  if (!selectedAsset.value) return
  await insertAsset(selectedAsset.value)
  detailsOpen.value = false
}
</script>

<template>
  <section data-test-id="assets-panel" class="flex min-h-0 flex-1 flex-col overflow-hidden">
    <div class="flex shrink-0 items-center gap-2 px-2 py-2">
      <AppInput
        v-model="query"
        type="search"
        data-test-id="assets-search"
        size="sm"
        class="min-w-0 flex-1"
        :placeholder="workspace ? 'Search components...' : panels.searchLocalComponents"
      />
      <AppButton
        v-if="!workspace"
        v-bind="insertButton"
        class="relative"
        :aria-label="libraryUpdateCount > 0 ? panels.reviewLibraryUpdates : panels.manageLibraries"
        @click="openLibraries"
      >
        <icon-lucide-library class="size-3.5" />
        <span
          v-if="libraryUpdateCount > 0"
          class="absolute top-0.5 right-0.5 min-w-2.5 rounded-full bg-accent px-0.5 text-center text-[8px] leading-2.5 text-on-accent"
        >
          {{ libraryUpdateCount }}
        </span>
      </AppButton>
      <SegmentedControl
        v-if="!workspace"
        v-model="assetView"
        data-test-id="assets-view-toggle"
        :options="viewOptions"
        :label="panels.assetView"
        :ui="viewUI"
      >
        <template #option="{ option }">
          <icon-lucide-layout-grid v-if="option.value === 'grid'" class="size-3" />
          <icon-lucide-list v-else class="size-3" />
        </template>
      </SegmentedControl>
    </div>

    <div v-if="workspace" class="shrink-0 px-3 pb-3">
      <AppButton
        class="w-full"
        variant="solid"
        color="primary"
        :disabled="!createComponent.enabled.value"
        @click="runCommand('selection.createComponent')"
      >
        <icon-lucide-diamond-plus class="size-4" />{{ commands.createComponent }}
      </AppButton>
      <p v-if="!createComponent.enabled.value" class="mt-2 text-xs text-muted">
        Select an element to create a component.
      </p>
    </div>
    <div class="scrollbar-thin flex min-h-0 flex-1 flex-col overflow-y-auto px-2 pb-2">
      <section v-for="group in assetGroups" :key="group.pageId" class="mb-3">
        <h2 v-if="!workspace" class="mb-1 px-1 text-[11px] font-semibold text-muted">
          {{ group.pageName }}
        </h2>
        <div :class="assetView === 'grid' ? 'grid grid-cols-2 gap-2' : 'flex flex-col gap-0.5'">
          <ContextMenuRoot v-for="asset in group.assets" :key="asset.id">
            <ContextMenuTrigger as-child>
              <div
                role="button"
                tabindex="0"
                data-test-id="asset-item"
                :data-asset-id="asset.id"
                :draggable="!!asset.componentId"
                :aria-busy="insertingAssetId === asset.id"
                :class="[
                  'group/asset rounded text-left text-xs text-surface outline-none hover:bg-hover focus-visible:ring-1 focus-visible:ring-panel-focus',
                  assetView === 'grid'
                    ? 'flex min-w-0 flex-col items-center gap-2 p-1.5'
                    : 'flex w-full items-center gap-2 px-1.5 py-1'
                ]"
                @click="void openDetails(asset)"
                @keydown="onAssetKeydown($event, asset)"
                @dragstart="onDragStart($event, asset)"
              >
                <AssetThumbnail
                  v-if="asset.componentId"
                  :fill="workspace && assetView === 'grid'"
                  :node-id="asset.componentId"
                  :alt="`${asset.name} preview`"
                  :size="
                    assetView === 'grid' ? ASSET_GRID_THUMBNAIL_SIZE : ASSET_LIST_THUMBNAIL_SIZE
                  "
                />
                <component
                  :is="nodeIcon(asset.node)"
                  v-else
                  class="size-4 shrink-0 text-component"
                  aria-hidden="true"
                />
                <span :class="assetView === 'grid' ? 'w-full min-w-0' : 'min-w-0 flex-1'">
                  <span class="flex min-w-0 items-center gap-1">
                    <span data-test-id="asset-name" class="truncate">{{ asset.name }}</span>
                    <span
                      v-if="asset.sourceLibraryKey"
                      data-test-id="asset-library-badge"
                      class="shrink-0 rounded bg-component/15 px-1 py-px text-[9px] font-medium text-component uppercase"
                    >
                      {{ panels.assetLibraryBadge }}
                    </span>
                  </span>
                  <span
                    v-if="assetView === 'list' && asset.variants.length > 0"
                    data-test-id="asset-variant-summary"
                    class="mt-0.5 block truncate text-[10px] text-muted"
                  >
                    {{
                      panels.assetVariantSummary({
                        count: asset.variantCount,
                        names: asset.variants.map((variant) => variant.name).join(', ')
                      })
                    }}
                  </span>
                  <span
                    v-if="assetView === 'list' && asset.description"
                    data-test-id="asset-description"
                    class="mt-0.5 block truncate text-[10px] text-muted"
                  >
                    {{ asset.description }}
                  </span>
                  <span
                    v-if="assetView === 'list' && asset.hasConflicts"
                    data-test-id="asset-variant-conflict"
                    class="mt-0.5 block truncate text-[10px] text-warning"
                  >
                    {{ panels.duplicateVariantValues }}
                  </span>
                </span>
                <div v-if="assetView === 'list'" class="flex shrink-0 items-center">
                  <Tip v-if="asset.docsURL" :label="panels.openDocumentation">
                    <AppButton
                      v-bind="insertButton"
                      data-test-id="asset-docs"
                      @pointerdown.stop
                      @click.stop="asset.docsURL ? openExternalLink(asset.docsURL) : undefined"
                    >
                      <icon-lucide-book-open class="size-3" />
                    </AppButton>
                  </Tip>
                  <Tip :label="commands.createInstance">
                    <AppButton
                      v-bind="insertButton"
                      data-test-id="asset-insert"
                      :disabled="insertingAssetId === asset.id"
                      @pointerdown.stop
                      @click.stop="insertAsset(asset)"
                    >
                      <icon-lucide-plus class="size-3" />
                    </AppButton>
                  </Tip>
                </div>
              </div>
            </ContextMenuTrigger>
            <ContextMenuPortal>
              <ContextMenuContent :class="contextMenu.content">
                <MenuScrollArea>
                  <ContextMenuItem
                    v-if="!asset.libraryId"
                    data-test-id="asset-context-go-to-main"
                    :class="contextMenu.item"
                    @select="focusAsset(asset)"
                  >
                    {{ panels.goToMainComponent }}
                  </ContextMenuItem>
                  <ContextMenuItem
                    data-test-id="asset-context-view-details"
                    :class="contextMenu.item"
                    @select="void openDetails(asset)"
                  >
                    {{ panels.viewDetails }}
                  </ContextMenuItem>
                </MenuScrollArea>
              </ContextMenuContent>
            </ContextMenuPortal>
          </ContextMenuRoot>
        </div>
      </section>

      <AppPlaceholder
        v-if="filteredAssets.length === 0"
        data-test-id="assets-empty"
        :label="panels.noLocalComponents"
        size="compact"
      >
        <template #icon>
          <icon-lucide-component class="size-4" />
        </template>
      </AppPlaceholder>
    </div>

    <LibraryManagerDialog v-model="librariesOpen" :initial-section="libraryInitialSection" />

    <AssetsPanelDetails
      v-if="shownAsset"
      v-model:open="detailsOpen"
      :asset="shownAsset"
      :preview-source="previewURL"
      :preview-loading="previewLoading"
      @insert="insertSelectedAsset"
    />
  </section>
</template>
