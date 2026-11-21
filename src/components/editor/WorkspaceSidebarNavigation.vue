<script setup lang="ts">
import { TabsList, TabsTrigger } from 'reka-ui'

import { useI18n } from '@open-pencil/vue/i18n'

import Tip from '@/components/ui/overlay/Tip.vue'

const { ai, panels } = useI18n()
</script>

<template>
  <TabsList
    aria-label="Workspace panels"
    class="@container/sidebar flex shrink-0 flex-wrap items-center gap-1 px-3 pt-3 pb-0.5"
  >
    <Tip :label="ai.chatHistory">
      <TabsTrigger
        value="chat-history"
        :aria-label="ai.chatHistory"
        class="group flex h-[29px] min-w-[29px] items-center gap-2 rounded-md px-1.5 text-[13px] @min-[300px]/sidebar:px-2.5 font-medium text-muted outline-none hover:bg-hover focus-visible:ring-2 focus-visible:ring-panel-focus data-[state=active]:bg-hover data-[state=active]:text-surface"
      >
        <icon-lucide-messages-square class="size-4" />
        <span class="hidden @min-[340px]/sidebar:group-data-[state=active]:inline">{{
          ai.chatHistory
        }}</span>
      </TabsTrigger>
    </Tip>
    <Tip :label="ai.chatSettings">
      <TabsTrigger
        value="chat"
        :aria-label="ai.chatSettings"
        class="group flex h-[29px] min-w-[29px] items-center gap-2 rounded-md px-1.5 text-[13px] @min-[300px]/sidebar:px-2.5 font-medium text-muted outline-none hover:bg-hover focus-visible:ring-2 focus-visible:ring-panel-focus data-[state=active]:bg-hover data-[state=active]:text-surface"
      >
        <icon-lucide-message-circle class="size-4" />
        <span class="hidden @min-[300px]/sidebar:group-data-[state=active]:inline">{{
          ai.chatSettings
        }}</span>
      </TabsTrigger>
    </Tip>
    <Tip :label="panels.layers">
      <TabsTrigger
        value="layers"
        :aria-label="panels.layers"
        class="group flex h-[29px] min-w-[29px] items-center gap-2 rounded-md px-1.5 text-[13px] @min-[300px]/sidebar:px-2.5 font-medium text-muted outline-none hover:bg-hover focus-visible:ring-2 focus-visible:ring-panel-focus data-[state=active]:bg-hover data-[state=active]:text-surface"
      >
        <icon-lucide-layers class="size-4" />
        <span class="hidden @min-[300px]/sidebar:group-data-[state=active]:inline">{{
          panels.layers
        }}</span>
      </TabsTrigger>
    </Tip>
    <Tip :label="panels.slides">
      <TabsTrigger
        value="slides"
        :aria-label="panels.slides"
        class="group flex h-[29px] min-w-[29px] items-center gap-2 rounded-md px-1.5 text-[13px] @min-[300px]/sidebar:px-2.5 font-medium text-muted outline-none hover:bg-hover focus-visible:ring-2 focus-visible:ring-panel-focus data-[state=active]:bg-hover data-[state=active]:text-surface"
      >
        <icon-lucide-presentation class="size-4" />
        <span class="hidden @min-[300px]/sidebar:group-data-[state=active]:inline">{{
          panels.slides
        }}</span>
      </TabsTrigger>
    </Tip>
    <Tip :label="panels.components">
      <TabsTrigger
        value="components"
        :aria-label="panels.components"
        class="group flex h-[29px] min-w-[29px] items-center gap-2 rounded-md px-1.5 text-[13px] @min-[300px]/sidebar:px-2.5 font-medium text-muted outline-none hover:bg-hover focus-visible:ring-2 focus-visible:ring-panel-focus data-[state=active]:bg-hover data-[state=active]:text-surface"
      >
        <icon-lucide-blocks class="size-4" />
        <span class="hidden @min-[300px]/sidebar:group-data-[state=active]:inline">{{
          panels.components
        }}</span>
      </TabsTrigger>
    </Tip>
    <Tip :label="panels.libraries">
      <TabsTrigger
        value="libraries"
        :aria-label="panels.libraries"
        class="group flex h-[29px] min-w-[29px] items-center gap-2 rounded-md px-1.5 text-[13px] @min-[300px]/sidebar:px-2.5 font-medium text-muted outline-none hover:bg-hover focus-visible:ring-2 focus-visible:ring-panel-focus data-[state=active]:bg-hover data-[state=active]:text-surface"
      >
        <icon-lucide-library class="size-4" /><span
          class="hidden @min-[300px]/sidebar:group-data-[state=active]:inline"
          >{{ panels.libraries }}</span
        >
      </TabsTrigger>
    </Tip>
  </TabsList>
</template>
