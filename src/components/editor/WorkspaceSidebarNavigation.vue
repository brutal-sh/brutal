<script setup lang="ts">
import { TabsList, TabsTrigger } from 'reka-ui'

import { useI18n } from '@open-pencil/vue/i18n'

import Tip from '@/components/ui/overlay/Tip.vue'

const { ai, panels } = useI18n()
const tabClass =
  'inline-flex h-[29px] items-center justify-center rounded-lg text-[13px] font-medium text-muted outline-none hover:bg-hover focus-visible:ring-2 focus-visible:ring-panel-focus data-[state=active]:bg-hover data-[state=active]:text-surface'
</script>

<template>
  <TabsList
    aria-label="Workspace panels"
    class="flex shrink-0 items-center gap-px px-3 pt-3 pb-0.5"
  >
    <Tip :label="ai.chatHistory">
      <TabsTrigger
        value="chat-history"
        :aria-label="ai.chatHistory"
        :class="[tabClass, 'shrink-0 px-2']"
      >
        <icon-lucide-messages-circle class="size-[15px]" />
      </TabsTrigger>
    </Tip>
    <Tip :label="ai.chatSettings">
      <TabsTrigger
        value="chat"
        :aria-label="ai.chatSettings"
        :class="[tabClass, 'min-w-0 gap-1.5 px-2']"
      >
        <icon-lucide-message-circle class="size-[15px] shrink-0" />
        <span class="max-w-20 truncate">{{ ai.chatSettings }}</span>
      </TabsTrigger>
    </Tip>
    <Tip :label="panels.layers">
      <TabsTrigger
        value="layers"
        :aria-label="panels.layers"
        :class="[tabClass, 'ml-auto w-[29px] shrink-0']"
      >
        <icon-lucide-layers class="size-[15px]" />
      </TabsTrigger>
    </Tip>
    <Tip :label="panels.slides">
      <TabsTrigger
        value="slides"
        :aria-label="panels.slides"
        :class="[tabClass, 'w-[29px] shrink-0']"
      >
        <icon-lucide-presentation class="size-[15px]" />
      </TabsTrigger>
    </Tip>
    <Tip :label="panels.components">
      <TabsTrigger
        value="components"
        :aria-label="panels.components"
        :class="[tabClass, 'w-[29px] shrink-0']"
      >
        <icon-lucide-component class="size-[15px]" />
      </TabsTrigger>
    </Tip>
    <Tip :label="panels.libraries">
      <TabsTrigger
        value="libraries"
        :aria-label="panels.libraries"
        :class="[tabClass, 'w-[29px] shrink-0']"
      >
        <icon-lucide-library class="size-[15px]" />
      </TabsTrigger>
    </Tip>
  </TabsList>
</template>
