<script setup lang="ts">
import { TabsList, TabsTrigger } from 'reka-ui'

import IconButton from '@/components/ui/button/IconButton.vue'
import Tip from '@/components/ui/overlay/Tip.vue'

defineEmits<{ libraries: [] }>()
</script>

<template>
  <TabsList aria-label="Workspace panels" class="flex shrink-0 items-center gap-1 px-3 py-3">
    <Tip label="Agent">
      <TabsTrigger
        value="agent"
        class="group flex h-8 items-center gap-2 rounded-lg px-2.5 text-muted outline-none hover:bg-hover focus-visible:ring-2 focus-visible:ring-panel-focus data-[state=active]:bg-hover data-[state=active]:text-surface"
      >
        <icon-lucide-message-circle class="size-4" />
        <span class="hidden text-xs group-data-[state=active]:inline">Agent</span>
        <span class="sr-only group-data-[state=active]:hidden">Agent</span>
      </TabsTrigger>
    </Tip>
    <Tip label="Layers">
      <TabsTrigger
        value="layers"
        aria-label="Layers"
        class="group flex h-8 items-center gap-2 rounded-lg px-2.5 text-muted outline-none hover:bg-hover focus-visible:ring-2 focus-visible:ring-panel-focus data-[state=active]:bg-hover data-[state=active]:text-surface"
      >
        <icon-lucide-layers class="size-4" />
        <span class="hidden text-xs group-data-[state=active]:inline">Layers</span>
      </TabsTrigger>
    </Tip>
    <Tip label="Slides">
      <TabsTrigger
        value="slides"
        aria-label="Slides"
        class="group flex h-8 items-center gap-2 rounded-lg px-2.5 text-muted outline-none hover:bg-hover focus-visible:ring-2 focus-visible:ring-panel-focus data-[state=active]:bg-hover data-[state=active]:text-surface"
      >
        <icon-lucide-presentation class="size-4" />
        <span class="hidden text-xs group-data-[state=active]:inline">Slides</span>
      </TabsTrigger>
    </Tip>
    <Tip label="Components">
      <TabsTrigger
        value="components"
        aria-label="Components"
        class="group flex h-8 items-center gap-2 rounded-lg px-2.5 text-muted outline-none hover:bg-hover focus-visible:ring-2 focus-visible:ring-panel-focus data-[state=active]:bg-hover data-[state=active]:text-surface"
      >
        <icon-lucide-blocks class="size-4" />
        <span class="hidden text-xs group-data-[state=active]:inline">Components</span>
      </TabsTrigger>
    </Tip>
    <IconButton label="Libraries" size="sm" @click="$emit('libraries')">
      <icon-lucide-library class="size-4" />
    </IconButton>
  </TabsList>
</template>
