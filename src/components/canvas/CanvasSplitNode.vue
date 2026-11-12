<script setup lang="ts">
import { useElementSize } from '@vueuse/core'
import { sum } from 'es-toolkit'
import { SplitterGroup, SplitterPanel, SplitterResizeHandle } from 'reka-ui'
import { tv } from 'tailwind-variants'
import { computed, useTemplateRef } from 'vue'

import { useEditorStore } from '@/app/editor/active-store'
import type { CanvasSplitNode } from '@/app/editor/panes/split-tree'
import CanvasPaneHeader from '@/components/canvas/CanvasPaneHeader.vue'
import EditorCanvas from '@/components/EditorCanvas.vue'
import splitterTheme from '@/theme/splitter'

const { node } = defineProps<{
  node: CanvasSplitNode
}>()

const store = useEditorStore()
const direction = computed(() => (node.type === 'split' ? node.direction : 'horizontal'))
const splitterStyles = tv(splitterTheme)
const group = useTemplateRef<InstanceType<typeof SplitterGroup>>('group')
const { width, height } = useElementSize(() => {
  const element: unknown = group.value?.$el
  return element instanceof HTMLElement ? element : null
})
// Keep room for the 24px actions, padding and the compact two-row header.
const MIN_PANE_WIDTH = 40
const MIN_PANE_HEIGHT = 56

function minimumExtent(child: CanvasSplitNode, axis: 'horizontal' | 'vertical'): number {
  if (child.type === 'pane') return axis === 'horizontal' ? MIN_PANE_WIDTH : MIN_PANE_HEIGHT
  const extents = child.children.map((item) => minimumExtent(item, axis))
  return child.direction === axis ? sum(extents) : Math.max(...extents)
}

function minimumSize(child: CanvasSplitNode) {
  const extent = direction.value === 'horizontal' ? width.value : height.value
  return extent > 0 ? Math.max(12, (minimumExtent(child, direction.value) / extent) * 100) : 12
}

function setLayout(sizes: number[]) {
  if (node.type === 'split') store.setSplitSizes(node.id, sizes)
}
</script>

<template>
  <div
    v-if="node.type === 'pane'"
    :data-pane-id="node.paneId"
    class="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
  >
    <CanvasPaneHeader v-if="store.visiblePaneCount.value > 1" :pane-id="node.paneId" />
    <EditorCanvas :pane-id="node.paneId" />
  </div>

  <SplitterGroup
    v-else
    ref="group"
    :id="node.id"
    :direction="direction"
    class="flex min-h-0 min-w-0 flex-1 overflow-hidden"
    @layout="setLayout"
  >
    <template
      v-for="(child, index) in node.children"
      :key="child.type === 'pane' ? child.paneId : child.id"
    >
      <SplitterPanel
        :id="`${node.id}-panel-${index}`"
        :default-size="node.sizes[index]"
        :min-size="minimumSize(child)"
        class="flex min-h-0 min-w-0 overflow-hidden"
      >
        <CanvasSplitNode :node="child" />
      </SplitterPanel>
      <SplitterResizeHandle
        v-if="index < node.children.length - 1"
        :id="`${node.id}-handle-${index}`"
        :data-split-id="node.id"
        :class="splitterStyles({ direction }).handle()"
      >
        <div :class="splitterStyles({ direction }).divider()" />
      </SplitterResizeHandle>
    </template>
  </SplitterGroup>
</template>
