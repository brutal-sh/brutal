<script setup lang="ts">
import { computed, useId } from 'vue'

import { useI18n } from '@open-pencil/vue/i18n'

import { mcpRuntime } from '@/app/automation/mcp/runtime'
import { openSettingsDialog } from '@/app/settings/dialog'
import { designCodeGuideOpen } from '@/app/shell/guides'
import AppButton from '@/components/ui/button/AppButton.vue'
import { AppDialog } from '@/components/ui/dialog'
import AppStatus from '@/components/ui/feedback/AppStatus.vue'

const { files, common, automation } = useI18n()
const descriptionId = useId()
const status = computed(
  () =>
    ({
      idle: automation.value.statusIdle,
      starting: automation.value.statusStarting,
      running: automation.value.statusRunning,
      stopped: automation.value.statusStopped,
      error: automation.value.statusError
    })[mcpRuntime.status]
)
const tone = computed(() => (mcpRuntime.status === 'running' ? 'success' : 'neutral'))

function configure() {
  designCodeGuideOpen.value = false
  openSettingsDialog('mcp')
}
</script>

<template>
  <AppDialog
    v-model:open="designCodeGuideOpen"
    :heading="files.codeGuideTitle"
    :aria-describedby="descriptionId"
    :close-label="common.close"
    size="lg"
    :ui="{
      overlay: 'bg-black/60',
      content:
        '@container/guide w-[min(896px,94vw)] max-h-[80vh] rounded-[10px] border border-dialog-border bg-dialog-surface',
      header: 'border-b-0 px-6 pt-6 pb-4',
      title: 'flex items-center gap-2 text-lg leading-6',
      body: 'px-6 pt-0 pb-6'
    }"
  >
    <template #title>
      <icon-lucide-code class="size-5 shrink-0 text-muted" aria-hidden="true" />
      {{ files.codeGuideTitle }}
    </template>
    <div class="grid min-w-0 gap-7 @3xl/guide:grid-cols-[minmax(0,1fr)_304px]">
      <div class="min-w-0 space-y-5 text-xs leading-4 text-muted">
        <p :id="descriptionId">{{ files.codeGuideDescription }}</p>
        <div class="space-y-3">
          <h3 class="text-[13px] font-semibold text-surface">{{ files.codeGuideServer }}</h3>
          <AppStatus :tone="tone">{{ status }}</AppStatus>
        </div>
        <div class="space-y-5 border-t border-dialog-border pt-4">
          <h3 class="flex items-center gap-2 text-[13px] font-semibold text-surface">
            <icon-lucide-terminal class="size-4" aria-hidden="true" />
            {{ files.codeGuideSteps }}
          </h3>
          <ol class="list-decimal space-y-3 pl-6">
            <li>{{ files.codeGuideLaunch }}</li>
            <li>
              {{ files.codeGuideConnect }}
              <AppButton variant="outline" size="xs" class="mt-2" @click="configure">
                {{ files.codeGuideSettings }}
              </AppButton>
            </li>
            <li>{{ files.codeGuideGenerate }}</li>
          </ol>
        </div>
        <div class="space-y-3">
          <h3 class="font-semibold text-surface">{{ files.codeGuideExamples }}</h3>
          <pre
            v-for="prompt in [
              files.codeGuidePagePrompt,
              files.codeGuideVariablesPrompt,
              files.codeGuideComponentPrompt
            ]"
            :key="prompt"
            class="rounded bg-black p-3 font-mono text-sm leading-5 break-words whitespace-pre-wrap text-white"
          ><code>% {{ prompt }}</code></pre>
        </div>
      </div>
      <aside
        class="hidden min-w-0 self-center overflow-hidden rounded-xl border border-dialog-border bg-canvas @3xl/guide:block"
        :aria-label="files.codeGuideServer"
      >
        <div
          class="flex items-center gap-2 border-b border-dialog-border bg-panel-secondary px-3 py-2.5"
        >
          <icon-lucide-terminal class="size-4 text-muted" aria-hidden="true" />
          <span class="text-xs font-semibold">Brutal MCP</span>
        </div>
        <div class="space-y-6 p-4 font-mono text-xs leading-6">
          <div class="space-y-2">
            <div class="text-muted">openpen-mcp-http</div>
            <AppStatus :tone="tone">{{ status }}</AppStatus>
            <code class="block break-all text-muted">{{ mcpRuntime.endpoint }}</code>
          </div>
          <div class="border-t border-dialog-border pt-4 text-muted">
            {{ files.codeGuideGenerate }}
          </div>
        </div>
      </aside>
    </div>
  </AppDialog>
</template>
