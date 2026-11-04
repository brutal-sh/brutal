<script setup lang="ts">
import { hasGeneratedContent } from '@open-pencil/scene-graph/generated'
import { readIcon } from '@open-pencil/scene-graph/icons'
import { LAYOUT_CONTAINER_TYPES } from '@open-pencil/vue/controls/selection-layout'
import { useI18n } from '@open-pencil/vue/i18n'
import { LayoutControlsRoot } from '@open-pencil/vue/primitives/LayoutControls'

import ClipContentControl from '@/components/properties/layout/ClipContentControl.vue'
import FlexControls from '@/components/properties/layout/flex/FlexControls.vue'
import GridControls from '@/components/properties/layout/grid/GridControls.vue'
import LayoutFlowControl from '@/components/properties/layout/LayoutFlowControl.vue'
import LayoutWrapToggle from '@/components/properties/layout/LayoutWrapToggle.vue'
import PaddingControls from '@/components/properties/layout/padding/PaddingControls.vue'
import SizeControls from '@/components/properties/layout/size/SizeControls.vue'
import TextResizingControl from '@/components/properties/layout/TextResizingControl.vue'
import IconButton from '@/components/ui/button/IconButton.vue'
import PanelSection from '@/components/ui/panel/PanelSection.vue'

const { panels } = useI18n()
const { compact = false } = defineProps<{ compact?: boolean }>()
</script>

<template>
  <LayoutControlsRoot v-slot="ctx">
    <template v-if="ctx.node">
      <!-- A generated frame, such as a shape with text, lays out its own sublayers; its auto layout is not offered. -->
      <PanelSection
        :label="
          ctx.node.layoutMode === 'NONE' || hasGeneratedContent(ctx.node)
            ? panels.layout
            : compact
              ? 'Flex Layout'
              : panels.autoLayout
        "
      >
        <template v-if="LAYOUT_CONTAINER_TYPES.has(ctx.node.type)" #actions>
          <IconButton
            :label="
              compact
                ? ctx.node.layoutMode === 'NONE'
                  ? 'Add flex layout'
                  : 'Remove flex layout'
                : ctx.node.layoutMode === 'NONE'
                  ? panels.addAutoLayout
                  : panels.removeAutoLayout
            "
            size="xs"
            :active="ctx.node.layoutMode !== 'NONE'"
            class="data-[state=on]:bg-accent/15"
            :class="compact ? 'data-[state=on]:text-primary' : undefined"
            @click="
              ctx.editor.setLayoutMode(
                ctx.node.id,
                ctx.node.layoutMode === 'NONE' ? 'VERTICAL' : 'NONE',
                compact
              )
            "
          >
            <icon-lucide-layout-panel-top class="size-3.5" />
          </IconButton>
        </template>

        <LayoutFlowControl
          v-if="LAYOUT_CONTAINER_TYPES.has(ctx.node.type) && (!compact || !readIcon(ctx.node))"
          :compact="compact"
        >
          <LayoutWrapToggle v-if="ctx.isFlex && !compact" />
        </LayoutFlowControl>
        <FlexControls v-if="compact && ctx.isFlex" compact />
        <div
          v-if="ctx.node.type !== 'TEXT'"
          :class="
            compact ? 'mb-1 text-[9px] leading-3 text-muted' : 'mt-2 mb-1 text-[11px] text-muted'
          "
        >
          {{ panels.dimensions }}
        </div>
        <TextResizingControl v-if="ctx.node.type === 'TEXT'" />
        <SizeControls :compact="compact" />
        <ClipContentControl
          v-if="
            !compact && LAYOUT_CONTAINER_TYPES.has(ctx.node.type) && ctx.node.layoutMode === 'NONE'
          "
        />

        <template
          v-if="LAYOUT_CONTAINER_TYPES.has(ctx.node.type) && ctx.node.layoutMode !== 'NONE'"
        >
          <FlexControls v-if="ctx.isFlex && !compact" />
          <template v-if="ctx.isGrid">
            <GridControls />
            <PaddingControls />
            <ClipContentControl v-if="!compact" />
          </template>
        </template>
      </PanelSection>
    </template>
  </LayoutControlsRoot>
</template>
