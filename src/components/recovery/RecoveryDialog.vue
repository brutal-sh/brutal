<script setup lang="ts">
import { AlertDialogCancel, AlertDialogDescription, AlertDialogTitle } from 'reka-ui'
import { nextTick, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'

import { useI18n } from '@open-pencil/vue/i18n'

import { exposeRecoveryReadiness } from '@/app/browser-bridge'
import type { RecoverySnapshotMeta } from '@/app/document/recovery'
import { recoveryEnabled } from '@/app/document/recovery/preferences'
import { useDateFormat } from '@/app/i18n/date'
import { createDeferred } from '@/app/runtime/deferred'
import { toast } from '@/app/shell/ui'
import { formatStorageBytes } from '@/app/storage/format-bytes'
import { discardRecoverySnapshot, listRecoverySnapshots, restoreRecoverySnapshot } from '@/app/tabs'
import AppButton from '@/components/ui/button/AppButton.vue'

const { recovery, common } = useI18n()
const route = useRoute()
const snapshots = ref<RecoverySnapshotMeta[]>([])
const busyId = ref<string | null>(null)
const discardError = ref(false)
const open = ref(false)
const startup = createDeferred<undefined>()
exposeRecoveryReadiness(startup.promise)

const dates = useDateFormat()
const updatedLabel = (snapshot: RecoverySnapshotMeta) =>
  dates.format(snapshot.updatedAt, 'dateTime')

/** Drops a handled snapshot; the last one stays listed while the dialog animates closed. */
function settle(snapshot: RecoverySnapshotMeta): void {
  const remaining = snapshots.value.filter((candidate) => candidate.id !== snapshot.id)
  if (remaining.length === 0) open.value = false
  else snapshots.value = remaining
}

async function restore(snapshot: RecoverySnapshotMeta): Promise<void> {
  busyId.value = snapshot.id
  try {
    await restoreRecoverySnapshot(snapshot.id)
    settle(snapshot)
  } catch (error) {
    console.warn('[Recovery] Failed to restore snapshot:', error)
    toast.error(recovery.value.restoreFailed)
  } finally {
    busyId.value = null
  }
}

async function discard(snapshot: RecoverySnapshotMeta): Promise<void> {
  busyId.value = snapshot.id
  discardError.value = false
  try {
    await discardRecoverySnapshot(snapshot.id)
    settle(snapshot)
  } catch (error) {
    console.warn('[Recovery] Failed to discard snapshot:', error)
    discardError.value = true
  } finally {
    busyId.value = null
  }
}

onMounted(async () => {
  try {
    if (route.path !== '/' || !recoveryEnabled.value) return
    snapshots.value = await listRecoverySnapshots()
    open.value = snapshots.value.length > 0
  } catch (error) {
    console.warn('[Recovery] Failed to list snapshots:', error)
  } finally {
    await nextTick()
    startup.resolve(undefined)
  }
})
</script>

<template>
  <AppAlertDialogRoot v-model:open="open" size="md" data-test-id="recovery-dialog">
    <div class="border-b border-border px-4 py-3">
      <AlertDialogTitle class="text-sm font-semibold text-surface">
        {{ recovery.dialogTitle }}
      </AlertDialogTitle>
    </div>
    <AppDialogBody class="space-y-3">
      <AlertDialogDescription class="text-xs text-muted">
        {{ recovery.dialogDescription }}
      </AlertDialogDescription>
      <AppAlert v-if="discardError" tone="error" :heading="recovery.discardFailed" />
      <div class="max-h-72 space-y-2 overflow-y-auto">
        <div
          v-for="snapshot in snapshots"
          :key="snapshot.id"
          class="flex items-center gap-3 rounded border border-border p-3"
        >
          <icon-lucide-file-clock class="size-4 shrink-0 text-muted" />
          <div class="min-w-0 flex-1">
            <p class="truncate text-xs font-medium text-surface">{{ snapshot.documentName }}</p>
            <p class="text-[11px] text-muted">
              {{ updatedLabel(snapshot) }} · {{ formatStorageBytes(snapshot.byteLength) }}
            </p>
          </div>
          <AppButton
            color="error"
            variant="ghost"
            size="xs"
            :disabled="busyId !== null"
            @click="discard(snapshot)"
          >
            {{ recovery.discard }}
          </AppButton>
          <AppButton
            color="primary"
            variant="solid"
            size="xs"
            :disabled="busyId !== null"
            @click="restore(snapshot)"
          >
            {{ recovery.restore }}
          </AppButton>
        </div>
      </div>
    </AppDialogBody>
    <AppDialogFooter>
      <AlertDialogCancel as-child>
        <AppButton color="neutral" variant="ghost">{{ common.close }}</AppButton>
      </AlertDialogCancel>
    </AppDialogFooter>
  </AppAlertDialogRoot>
</template>
