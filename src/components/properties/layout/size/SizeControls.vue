<script setup lang="ts">
import { computed } from 'vue'

import { authoredLayoutSizing } from '@open-pencil/scene-graph/layout'
import { useI18n } from '@open-pencil/vue/i18n'
import { useLayoutControlsContext } from '@open-pencil/vue/primitives/LayoutControls'

import SizeAxisField from '@/components/properties/layout/size/SizeAxisField.vue'
import SizeLimitField from '@/components/properties/layout/size/SizeLimitField.vue'
import type { SizeLimitItem } from '@/components/properties/layout/size/types'
import IconButton from '@/components/ui/button/IconButton.vue'
import PanelGrid from '@/components/ui/panel/PanelGrid.vue'
import AppCheckbox from '@/components/ui/toggle/AppCheckbox.vue'

const { compact = false } = defineProps<{ compact?: boolean }>()
const ctx = useLayoutControlsContext()
const { panels } = useI18n()

const sizeLimits = computed<SizeLimitItem[]>(() => [
  {
    prop: 'minWidth',
    icon: panels.value.minWidthShort,
    label: panels.value.minWidthShort,
    setLabel: panels.value.setToCurrentWidth,
    removeLabel: panels.value.removeMinWidth
  },
  {
    prop: 'maxWidth',
    icon: panels.value.maxWidthShort,
    label: panels.value.maxWidthShort,
    setLabel: panels.value.setToCurrentWidth,
    removeLabel: panels.value.removeMaxWidth
  },
  {
    prop: 'minHeight',
    icon: panels.value.minHeightShort,
    label: panels.value.minHeightShort,
    setLabel: panels.value.setToCurrentHeight,
    removeLabel: panels.value.removeMinHeight
  },
  {
    prop: 'maxHeight',
    icon: panels.value.maxHeightShort,
    label: panels.value.maxHeightShort,
    setLabel: panels.value.setToCurrentHeight,
    removeLabel: panels.value.removeMaxHeight
  }
])

const visibleSizeLimits = computed(() =>
  sizeLimits.value.filter((item) => ctx.node[item.prop] != null)
)
</script>

<template>
  <PanelGrid :key="ctx.node.id" :columns="compact ? 2 : 1">
    <SizeAxisField axis="width" icon="W" :label="panels.width" :compact="compact" />
    <SizeAxisField axis="height" icon="H" :label="panels.height" :compact="compact" />
    <template v-if="ctx.aspectRatioLockable && !compact" #actions>
      <IconButton
        :label="panels.lockAspectRatio"
        size="xs"
        toggle
        :active="ctx.aspectRatioLocked"
        data-test-id="aspect-ratio-lock"
        @click="ctx.toggleAspectRatioLock"
      >
        <icon-lucide-proportions class="size-3" />
      </IconButton>
    </template>
  </PanelGrid>
  <div v-if="compact" class="mt-1.5 grid grid-cols-2 gap-1.5 text-[11px] text-surface">
    <label
      v-for="axis in ['width', 'height'] as const"
      :key="axis"
      class="flex items-center gap-1.5"
    >
      <AppCheckbox
        neutral
        :ariaLabel="axis === 'width' ? 'Fill Width' : 'Fill Height'"
        :model-value="
          authoredLayoutSizing(
            ctx.editor.graph,
            ctx.node,
            axis === 'width' ? 'HORIZONTAL' : 'VERTICAL'
          ) === 'FILL'
        "
        :disabled="
          ctx.isInAutoLayout &&
          !(axis === 'width' ? ctx.widthSizingOptions : ctx.heightSizingOptions).some(
            (option) => option.value === 'FILL'
          )
        "
        @update:model-value="ctx.setAxisSizing(axis, $event ? 'FILL' : 'FIXED', true)"
      />{{ axis === 'width' ? 'Fill Width' : 'Fill Height' }}
    </label>
    <template v-if="ctx.node.layoutMode !== 'NONE'">
      <label
        v-for="axis in ['width', 'height'] as const"
        :key="axis"
        class="flex items-center gap-1.5"
      >
        <AppCheckbox
          neutral
          :ariaLabel="axis === 'width' ? 'Hug Width' : 'Hug Height'"
          :model-value="(axis === 'width' ? ctx.widthSizing : ctx.heightSizing) === 'HUG'"
          :disabled="
            !(axis === 'width' ? ctx.widthSizingOptions : ctx.heightSizingOptions).some(
              (option) => option.value === 'HUG'
            )
          "
          @update:model-value="ctx.setAxisSizing(axis, $event ? 'HUG' : 'FIXED', true)"
        />{{ axis === 'width' ? 'Hug Width' : 'Hug Height' }}
      </label>
    </template>
  </div>

  <PanelGrid v-if="visibleSizeLimits.length" :columns="2" class="mt-1.5">
    <SizeLimitField v-for="item in visibleSizeLimits" :key="item.prop" :item="item" />
  </PanelGrid>
</template>
