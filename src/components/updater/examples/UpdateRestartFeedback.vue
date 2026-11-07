<script setup lang="ts">
import { onMounted, reactive } from 'vue'

import {
  createUpdaterSession,
  type PendingUpdate,
  type UpdaterBackend
} from '@/app/shell/updater/session'
import UpdatePrompt from '@/components/updater/UpdatePrompt.vue'

const { scenario } = defineProps<{ scenario: 'denied' | 'reject-once' }>()
const calls = reactive({
  check: 0,
  download: 0,
  install: 0,
  confirmRestart: 0,
  relaunch: 0,
  close: 0,
  closeWindow: 0
})

// Fictitious release and native operations; only the controller and component are real.
const update: PendingUpdate = {
  version: '0.16.1',
  currentVersion: '0.16.0',
  body: 'Example Open Pen release notes.',
  async download() {
    calls.download++
  },
  async install() {
    calls.install++
  },
  async close() {
    calls.close++
  }
}
const backend: UpdaterBackend = {
  async check() {
    calls.check++
    return update
  },
  async confirmRestart() {
    calls.confirmRestart++
    return scenario !== 'denied'
  },
  async relaunch() {
    calls.relaunch++
    if (scenario === 'reject-once' && calls.relaunch === 1)
      throw new Error('test-owned relaunch refused')
  },
  async closeWindow() {
    calls.closeWindow++
  },
  installQuitsApp: false
}
const session = createUpdaterSession(backend)
onMounted(() => {
  void session.check()
})
</script>

<template>
  <div class="h-[520px] w-[560px] overflow-hidden rounded-lg border border-border">
    <UpdatePrompt
      :state="session.state.value"
      current-version="0.16.0"
      @install="session.install"
      @cancel="session.cancel"
      @restart="session.restart"
      @retry="session.retry"
      @dismiss="session.dismiss"
    />
  </div>
  <output
    v-for="(count, name) in calls"
    :key="name"
    :aria-label="`${name} calls`"
    class="sr-only"
    >{{ count }}</output
  >
</template>
