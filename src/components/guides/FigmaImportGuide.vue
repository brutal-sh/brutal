<script setup lang="ts">
import { ToastProvider, ToastViewport } from 'reka-ui'

import { useI18n } from '@open-pencil/vue/i18n'

import { figmaImportGuideOpen } from '@/app/shell/guides'
import AppToast from '@/components/ui/feedback/AppToast.vue'

const { files, common } = useI18n()
</script>

<template>
  <ToastProvider swipe-direction="down">
    <AppToast
      v-if="figmaImportGuideOpen"
      :message="files.figmaGuideTitle"
      variant="info"
      :duration="20000"
      :action-label="common.close"
      :ui="{
        root: 'w-[min(356px,90vw)] max-w-none items-center gap-2 rounded-lg px-4 py-4',
        icon: 'size-4',
        message: 'font-semibold text-surface',
        action: 'self-start',
        content: 'text-[11px] leading-[15px] text-muted'
      }"
      @close="figmaImportGuideOpen = false"
      @action="figmaImportGuideOpen = false"
    >
      <ol class="mt-1 list-decimal space-y-2 pl-3">
        <li>{{ files.figmaGuideClipboard }}</li>
        <li>{{ files.figmaGuideFile }}</li>
      </ol>
      <p class="mt-2">{{ files.figmaGuideLimits }}</p>
    </AppToast>
    <ToastViewport
      :label="`${files.figmaGuideTitle} (F9)`"
      :hotkey="['F9']"
      class="fixed right-6 bottom-6 z-50 flex outline-none"
    />
  </ToastProvider>
</template>
