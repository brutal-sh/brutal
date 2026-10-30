<script setup lang="ts">
import { TabsList, TabsTrigger } from 'reka-ui'

import { useI18n } from '@open-pencil/vue/i18n'

import IconButton from '@/components/ui/button/IconButton.vue'
import Tip from '@/components/ui/overlay/Tip.vue'

defineEmits<{ libraries: [] }>()
const { ai, panels } = useI18n()
</script>

<template>
  <TabsList aria-label="Workspace panels" class="flex shrink-0 items-center gap-1 px-3 pt-3 pb-0.5">
    <Tip :label="ai.modelAgentConnection">
      <TabsTrigger
        value="agent"
        class="group flex h-[29px] min-w-[29px] items-center gap-2 rounded-md px-2.5 text-[13px] font-medium text-muted outline-none hover:bg-hover focus-visible:ring-2 focus-visible:ring-panel-focus data-[state=active]:bg-hover data-[state=active]:text-surface"
      >
        <icon-lucide-message-circle class="size-4" />
        <span class="hidden group-data-[state=active]:inline">{{ ai.modelAgentConnection }}</span>
        <span class="sr-only group-data-[state=active]:hidden">{{ ai.modelAgentConnection }}</span>
      </TabsTrigger>
    </Tip>
    <Tip :label="panels.layers">
      <TabsTrigger
        value="layers"
        :aria-label="panels.layers"
        class="group flex h-[29px] min-w-[29px] items-center gap-2 rounded-md px-2.5 text-[13px] font-medium text-muted outline-none hover:bg-hover focus-visible:ring-2 focus-visible:ring-panel-focus data-[state=active]:bg-hover data-[state=active]:text-surface"
      >
        <icon-lucide-layers class="size-4" />
        <span class="hidden group-data-[state=active]:inline">{{ panels.layers }}</span>
      </TabsTrigger>
    </Tip>
    <Tip :label="panels.slides">
      <TabsTrigger
        value="slides"
        :aria-label="panels.slides"
        class="group flex h-[29px] min-w-[29px] items-center gap-2 rounded-md px-2.5 text-[13px] font-medium text-muted outline-none hover:bg-hover focus-visible:ring-2 focus-visible:ring-panel-focus data-[state=active]:bg-hover data-[state=active]:text-surface"
      >
        <icon-lucide-presentation class="size-4" />
        <span class="hidden group-data-[state=active]:inline">{{ panels.slides }}</span>
      </TabsTrigger>
    </Tip>
    <Tip :label="panels.components">
      <TabsTrigger
        value="components"
        :aria-label="panels.components"
        class="group flex h-[29px] min-w-[29px] items-center gap-2 rounded-md px-2.5 text-[13px] font-medium text-muted outline-none hover:bg-hover focus-visible:ring-2 focus-visible:ring-panel-focus data-[state=active]:bg-hover data-[state=active]:text-surface"
      >
        <icon-lucide-blocks class="size-4" />
        <span class="hidden group-data-[state=active]:inline">{{ panels.components }}</span>
      </TabsTrigger>
    </Tip>
    <IconButton :label="panels.libraries" size="sm" @click="$emit('libraries')">
      <icon-lucide-library class="size-4" />
    </IconButton>
  </TabsList>
</template>
