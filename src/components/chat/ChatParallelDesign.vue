<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import { useI18n } from '@open-pencil/vue/i18n'

import type { ParallelDesignRun } from '@/app/ai/chat/parallel/run'
import AppButton from '@/components/ui/button/AppButton.vue'

import ChatTranscript from './ChatTranscript.vue'

const { run } = defineProps<{ run: ParallelDesignRun }>()
const emit = defineEmits<{ close: []; open: [id: string] }>()
const { ai } = useI18n()
const selectedIndex = ref(0)
const selected = computed(() => run.versions[selectedIndex.value])
const working = computed(() => run.versions.some((version) => version.pending))
const status = computed(() => ({
  working: ai.value.parallelDesignWorking,
  finished: ai.value.parallelDesignFinished,
  stopped: ai.value.parallelDesignStopped,
  failed: ai.value.parallelDesignFailed
}))

watch(
  () => run,
  () => {
    selectedIndex.value = 0
  }
)
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col" data-test-id="parallel-design-run">
    <div class="flex flex-wrap items-center gap-2 border-b border-border/50 px-3 py-2">
      <AppButton
        v-for="(version, index) in run.versions"
        :key="version.id"
        size="sm"
        :variant="selectedIndex === index ? 'solid' : 'outline'"
        :aria-pressed="selectedIndex === index"
        @click="selectedIndex = index"
      >
        {{ version.title }}
        <span role="status">{{ status[version.status] }}</span>
      </AppButton>
      <AppButton
        v-if="working"
        size="sm"
        variant="outline"
        :disabled="run.versions.every((version) => version.status !== 'working')"
        @click="run.stop()"
      >
        {{ ai.parallelDesignStopBoth }}
      </AppButton>
      <AppButton v-else size="sm" variant="outline" @click="emit('close')">
        {{ ai.parallelDesignBack }}
      </AppButton>
    </div>
    <ChatTranscript
      v-if="selected"
      :key="selected.id"
      :messages="selected.chat?.messages ?? []"
      :status="selected.chat?.status ?? 'ready'"
    />
    <div v-if="selected" class="flex justify-end border-t border-border/50 px-3 py-2">
      <AppButton
        v-if="selected.status === 'working'"
        size="sm"
        variant="outline"
        @click="selected.stop()"
      >
        {{ ai.parallelDesignStopVersion }}
      </AppButton>
      <AppButton
        v-else-if="!working && selected.saved"
        size="sm"
        variant="outline"
        @click="emit('open', selected.id)"
      >
        {{ ai.parallelDesignOpen }}
      </AppButton>
    </div>
  </div>
</template>
