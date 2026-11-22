<script setup lang="ts">
import type { Chat } from '@ai-sdk/vue'
import type { UIMessage } from 'ai'
import { TabsContent } from 'reka-ui'
import { computed, nextTick, ref, shallowRef, useTemplateRef, watch } from 'vue'

import { useI18n } from '@open-pencil/vue/i18n'

import { revokeImagePreviewURL } from '@/app/ai/attachment/image/prepare'
import { chatDocumentId } from '@/app/ai/chat/history/document'
import {
  dismissParallelDesign,
  parallelDesignFor,
  startParallelDesign
} from '@/app/ai/chat/parallel/run'
import {
  clearQueuedMessages,
  enqueueMessage,
  queuedMessages,
  removeQueuedMessage,
  takeNextMessage
} from '@/app/ai/chat/queue'
import { useChatRunLocation } from '@/app/ai/chat/run-location'
import type { ChatSubmission } from '@/app/ai/chat/submission/types'
import { useChatSubmission } from '@/app/ai/chat/submission/use'
import { saveChatTrace } from '@/app/ai/chat/trace/export'
import { useAIChat } from '@/app/ai/chat/use'
import {
  aiModelSettings,
  modelConnection,
  modelProfile,
  setModelRoleAssignment,
  type AIModelProfileId
} from '@/app/ai/models'
import { openAISetup } from '@/app/ai/models/settings/onboarding/dialog'
import { didHitStepLimit } from '@/app/ai/tools'
import { cloudBillingURL } from '@/app/cloud/integration'
import { getActiveEditorStore } from '@/app/editor/active-store'
import { homeCreation, takeHomeCreation } from '@/app/home/creation'
import { useDateFormat } from '@/app/i18n/date'
import { openSettingsDialog } from '@/app/settings/dialog'
import { openExternalLink, toast } from '@/app/shell/ui'
import { activeTab } from '@/app/tabs'
import ChatFollowAgentsToggle from '@/components/chat/ChatFollowAgentsToggle.vue'
import ChatHistory from '@/components/chat/ChatHistory.vue'
import ChatHistoryList from '@/components/chat/ChatHistoryList.vue'
import ChatInput from '@/components/chat/ChatInput.vue'
import ChatParallelDesign from '@/components/chat/ChatParallelDesign.vue'
import ChatPermissionDialog from '@/components/chat/ChatPermissionDialog.vue'
import ChatProfileSelect from '@/components/chat/ChatProfileSelect.vue'
import ChatProviderSetup from '@/components/chat/ChatProviderSetup.vue'
import ChatRunLocation from '@/components/chat/ChatRunLocation.vue'
import ChatTranscript from '@/components/chat/ChatTranscript.vue'
import { useImageDrop } from '@/components/chat/input/useImageDrop'
import AppButton from '@/components/ui/button/AppButton.vue'
import { AppConfirmationDialog } from '@/components/ui/dialog'

const { docked = false, activePanel = 'chat' } = defineProps<{
  docked?: boolean
  activePanel?: string
}>()

const {
  isConfigured,
  ensureChat,
  history,
  canContinueWithProvider,
  chatFailure,
  clearChatFailure,
  providerID
} = useAIChat()
const emit = defineEmits<{ showChat: [] }>()
const { ai, common, menu } = useI18n()
const dates = useDateFormat()
const runLocation = useChatRunLocation()

const chat = shallowRef<Chat<UIMessage> | null>(null)
const submission = useChatSubmission({
  chat,
  ensureChat,
  flush: history.flush,
  clearFailure: clearChatFailure,
  getEditor: getActiveEditorStore,
  messages: computed(() => ({
    openSettings: ai.value.openProviderSettingsAction,
    requestFailed: ai.value.chatRequestFailed,
    visionUnavailable: ai.value.visionModelUnavailable,
    cloudUnavailable: ai.value.chatCloudUnavailable,
    runSetup: ai.value.aiSetupRun,
    agentSetup: {
      'companion-missing': ai.value.chatPiCompanionMissing,
      'companion-outdated': ai.value.chatPiCompanionOutdated,
      'mcp-outdated': ai.value.chatMCPOutdated,
      'pi-sign-in': ai.value.chatPiSignIn,
      'pi-model': ai.value.chatPiModel
    }
  })),
  reportError: toast.error,
  openModelSettings: () => openSettingsDialog('ai'),
  openSetup: () => openAISetup()
})

const chatInput = useTemplateRef<{
  restoreDraft: (submission: ChatSubmission) => void
  dropFiles: (files: File[]) => void
}>('chatInput')
const panel = useTemplateRef<HTMLElement>('panel')
const chatContent = useTemplateRef<InstanceType<typeof TabsContent>>('chatContent')
// Images dropped anywhere on the chat go to the composer, when there is one to take them.
const { dragging: draggingImages } = useImageDrop(panel, {
  enabled: () => chatInput.value !== null,
  onImages: (files) => chatInput.value?.dropFiles(files)
})
let viewGeneration = 0

/** Puts an unsent message back only in the conversation it was written in. */
async function submitMessage(message: ChatSubmission) {
  const generation = viewGeneration
  if (await submission.submit(message)) return
  if (generation === viewGeneration) chatInput.value?.restoreDraft(message)
  else for (const image of message.images) revokeImagePreviewURL(image.previewURL)
}
// Restoring local history must not open a provider connection or read credentials.
void history.initialize().catch(() => {
  toast.error(ai.value.chatHistoryFailed)
})

const messages = computed(() => chat.value?.messages ?? history.messages.value)
const savedChats = computed(() => {
  const documentId = chatDocumentId(getActiveEditorStore())
  return history.conversations.value.map((conversation) => ({
    ...conversation,
    available: conversation.documentId === documentId
  }))
})
const historyOptions = computed(() => {
  const current = history.current.value
  if (!current || savedChats.value.some((row) => row.id === current.id)) return savedChats.value
  return [
    { ...current, available: current.documentId === chatDocumentId(getActiveEditorStore()) },
    ...savedChats.value
  ]
})
const agentHistoryReadOnly = computed(
  () => history.agentReadOnly.value && (!chat.value || history.chatEnded.value)
)
/** Set while the conversation changes, so stopping its reply does not send what waits. */
let queueHeld = false
async function historyAction(action: () => Promise<unknown>, revealChat = false) {
  const generation = ++viewGeneration
  const left = history.current.value?.id
  let switched = false
  submission.cancel()
  queueHeld = true
  try {
    await chat.value?.stop()
    await action()
    switched = true
  } catch {
    toast.error(ai.value.chatHistoryFailed)
  } finally {
    queueHeld = false
    if (generation === viewGeneration) {
      // Waiting messages belong to the conversation that was left, which a switch failing part
      // way, after it opened another, has left too; a switch that failed before keeps them.
      if (switched || history.current.value?.id !== left) {
        chat.value = null
        clearQueuedMessages()
        if (switched && revealChat && activePanel === 'chat-history') void revealConversation()
      } else if (status.value === 'ready') {
        // The stopped reply may have ended while the switch held the queue, which then waits
        // for no reply to end.
        sendNextQueued()
      }
    }
  }
}

async function revealConversation() {
  emit('showChat')
  await nextTick()
  const content: unknown = chatContent.value?.$el
  if (activePanel === 'chat' && content instanceof HTMLElement) content.focus()
}

function openConversation(id: string, revealChat = false) {
  if (id === history.current.value?.id) {
    if (revealChat) void revealConversation()
    return
  }
  void historyAction(() => history.open(id), revealChat)
}

async function renameConversation(id: string, title: string) {
  try {
    await history.rename(id, title)
  } catch {
    toast.error(ai.value.chatHistoryFailed)
  }
}

async function saveTrace(id: string) {
  const conversation = history.current.value
  if (conversation?.id !== id) return
  try {
    await saveChatTrace(conversation, messages.value)
  } catch {
    toast.error(ai.value.chatTraceFailed)
  }
}

/**
 * A Cloud that bills sells more credits; a self-hosted one has only the allowance its
 * administrator set, which renews or is raised.
 */
function cloudCreditsMessage(resetsAt: string | undefined): string {
  if (cloudBillingURL.value) return ai.value.chatCloudCreditsExhausted
  if (!resetsAt) return ai.value.chatCloudAllowanceUsed
  return ai.value.chatCloudAllowanceUsedUntil({ date: dates.format(resetsAt, 'dayTime') })
}
const failureMessage = computed(() => {
  switch (chatFailure.value?.reason) {
    case 'authentication':
      return ai.value.chatAuthenticationFailed
    case 'forbidden':
      return ai.value.chatForbidden
    case 'insufficient-credit':
      return ai.value.chatInsufficientCredit
    case 'cloud-credits-exhausted':
      return cloudCreditsMessage(chatFailure.value.resetsAt)
    case 'agent-model-unavailable':
      return chatFailure.value.detail ?? ai.value.chatModelNotFound
    case 'model-not-found':
      return ai.value.chatModelNotFound
    case 'network':
      return ai.value.chatNetworkFailed
    case 'output-limit':
      return ai.value.chatOutputLimit
    case 'rate-limit':
      return ai.value.chatRateLimited
    case 'request-failed':
      return ai.value.chatRequestFailed
    case 'sign-in-expired':
      return ai.value.chatSignInExpired
    case 'plan-forbidden':
      return ai.value.chatPlanForbidden
    default:
      return null
  }
})
const failureHasSettingsAction = computed(() =>
  ['authentication', 'forbidden', 'model-not-found', 'sign-in-expired', 'plan-forbidden'].includes(
    chatFailure.value?.reason ?? ''
  )
)
const status = computed(() => chat.value?.status ?? 'ready')
const twoVersions = ref(false)
const parallel = computed(() => parallelDesignFor(getActiveEditorStore()))
const canRunParallel = computed(
  () => providerID.value === 'acp:codex' && (status.value === 'ready' || status.value === 'error')
)
watch([activeTab, canRunParallel], () => {
  twoVersions.value = false
})
const modelSelectionDisabled = computed(
  () =>
    submission.busy.value ||
    history.busy.value ||
    status.value === 'submitted' ||
    status.value === 'streaming'
)
const pendingModel = shallowRef<{ id: AIModelProfileId; conversationId: string } | null>(null)
const confirmModelSwitch = computed({
  get: () => pendingModel.value !== null,
  set: (open: boolean) => {
    if (!open) pendingModel.value = null
  }
})

function selectModel(id: AIModelProfileId) {
  if (modelSelectionDisabled.value || id === aiModelSettings.value.assignments.design) return
  const profile = modelProfile(id)
  const connection = profile && modelConnection(profile.connectionId)
  if (!connection) return
  if (canContinueWithProvider(connection.providerID)) {
    setModelRoleAssignment('design', id)
    return
  }
  const conversationId = history.current.value?.id
  if (conversationId) pendingModel.value = { id, conversationId }
}

function startChatWithModel() {
  const choice = pendingModel.value
  if (
    !choice ||
    modelSelectionDisabled.value ||
    history.current.value?.id !== choice.conversationId
  )
    return
  const editor = getActiveEditorStore()
  void historyAction(async () => {
    await history.newChat()
    if (getActiveEditorStore() === editor) setModelRoleAssignment('design', choice.id)
  }, true)
}

function restoreModelFocus(event: Event) {
  const trigger = panel.value?.querySelector<HTMLButtonElement>(
    '[data-slot="chat-profile-trigger"]'
  )
  if (!trigger || trigger.disabled || trigger.getClientRects().length === 0) return
  event.preventDefault()
  trigger.focus({ preventScroll: true })
}

/**
 * A message written while the agent works waits for it: Enter steers, which the built-in chat
 * takes in once the current tool calls finish, and Alt+Enter waits until all work is done.
 */
function sendOrQueue(message: ChatSubmission, afterWork: boolean) {
  if (twoVersions.value && canRunParallel.value) {
    const unsupported = message.images.length || message.nodes.length || message.files?.length
    if (unsupported) {
      toast.error(ai.value.parallelDesignTextOnly)
      chatInput.value?.restoreDraft(message)
      return
    }
    const started = startParallelDesign(
      getActiveEditorStore(),
      message.modelText,
      [ai.value.parallelDesignVersion({ count: 1 }), ai.value.parallelDesignVersion({ count: 2 })],
      history.refresh
    )
    if (!started) {
      toast.error(ai.value.parallelDesignFailed)
      chatInput.value?.restoreDraft(message)
      return
    }
    twoVersions.value = false
    return
  }
  if (status.value === 'streaming' || status.value === 'submitted') {
    enqueueMessage(message, afterWork ? 'follow-up' : 'steer')
    return
  }
  void submitMessage(message)
}
// Once a reply ends, what waited goes next, one message per reply; a failed reply keeps them.
function sendNextQueued() {
  const next = takeNextMessage()
  if (next) void submitMessage(next)
}
watch(status, (now, before) => {
  if (now !== 'ready' || before === 'ready' || queueHeld) return
  sendNextQueued()
})
const showContinue = computed(() => {
  if (history.readOnly.value || agentHistoryReadOnly.value) return false
  if (status.value !== 'ready') return false
  if (messages.value.length === 0) return false
  const last = messages.value[messages.value.length - 1]
  return last.role === 'assistant' && didHitStepLimit()
})

// Asking again clears the failure, and its notice goes with it.
let failureToast: number | null = null
/** The notice outlives a switch to another tab, whose chat its Retry must not touch. */
function retryFailed(messageId: string | undefined): void {
  if (messageId && chat.value?.messages.at(-1)?.id === messageId) void submission.regenerate()
}
watch(
  () => chatFailure.value?.reason,
  (reason) => {
    if (failureToast !== null) toast.remove(failureToast)
    failureToast = null
    if (!reason) return
    const failedId = chat.value?.messages.at(-1)?.id
    failureToast = toast.error(
      failureMessage.value ?? ai.value.chatRequestFailed,
      failureAction(failedId)
    )
  }
)
function failureAction(failedId: string | undefined): { label: string; run: () => void } {
  const billingURL = cloudBillingURL.value
  if (chatFailure.value?.reason === 'cloud-credits-exhausted' && billingURL) {
    return { label: ai.value.manageCloudPlanAction, run: () => void openExternalLink(billingURL) }
  }
  return failureHasSettingsAction.value
    ? { label: ai.value.openProviderSettingsAction, run: () => openSettingsDialog('ai') }
    : { label: ai.value.retryRequest, run: () => retryFailed(failedId) }
}
watch(
  () => [activeTab.value?.id, activeTab.value?.store.state.preparation] as const,
  async ([tabId, preparation], [previousTabId]) => {
    // Another tab's waiting messages never go to this one, even one that opens still preparing.
    if (tabId !== previousTabId) clearQueuedMessages()
    if (preparation) {
      viewGeneration++
      submission.cancel()
      return
    }
    const generation = ++viewGeneration
    const conversationId = history.current.value?.id
    submission.cancel()
    if (tabId !== previousTabId) chat.value = null
    try {
      await history.initialize()
    } catch {
      if (generation === viewGeneration) {
        chat.value = null
        toast.error(ai.value.chatHistoryFailed)
      }
      return
    }
    // A page switch keeps the document and its conversation, so a running chat stays attached.
    if (generation === viewGeneration && history.current.value?.id !== conversationId) {
      chat.value = null
    }
  }
)

// A Home submission belongs only to the new document that requested it.
watch(
  homeCreation,
  async (pending) => {
    if (!pending || pending.editor !== getActiveEditorStore()) return
    await nextTick()
    await history.initialize()
    const message = takeHomeCreation(getActiveEditorStore())
    if (message) await submitMessage(message)
  },
  { immediate: true, flush: 'post' }
)

function closeParallel(id?: string) {
  dismissParallelDesign(getActiveEditorStore())
  if (id) openConversation(id)
}

function handleStop() {
  submission.stop()
}
</script>

<template>
  <div
    ref="panel"
    data-test-id="chat-panel"
    :data-docked="docked || undefined"
    class="group/agent flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden select-text data-[docked=true]:gap-2"
  >
    <div
      data-slot="chat-transcript-card"
      class="flex min-h-0 flex-1 flex-col overflow-hidden group-data-[docked=true]/agent:rounded-[20px] group-data-[docked=true]/agent:border group-data-[docked=true]/agent:border-island-border group-data-[docked=true]/agent:bg-panel"
    >
      <slot name="navigation" />
      <component
        :is="docked ? TabsContent : 'div'"
        ref="chatContent"
        :value="docked ? 'chat' : undefined"
        :force-mount="docked || undefined"
        v-show="!docked || activePanel === 'chat'"
        class="flex min-h-0 flex-1 flex-col"
      >
        <ChatParallelDesign
          v-if="parallel"
          :run="parallel"
          @close="closeParallel()"
          @open="closeParallel($event)"
        />
        <template v-else>
          <ChatHistory
            :docked="docked"
            :saved="history.conversations.value.some((row) => row.id === history.current.value?.id)"
            :conversations="historyOptions"
            :selected-id="history.current.value?.id"
            :disabled="history.busy.value"
            @create="historyAction(history.newChat)"
            @select="openConversation($event)"
            @rename="renameConversation"
            @save-trace="saveTrace"
            @delete="historyAction(() => history.remove($event))"
          >
            <template #actions><ChatFollowAgentsToggle /></template>
          </ChatHistory>
          <p v-if="history.storageError.value" role="alert" class="px-3 py-2 text-xs text-error">
            {{ ai.chatStorageFailed }}
          </p>
          <ChatProviderSetup v-if="!docked && !isConfigured" />

          <template v-if="isConfigured || messages.length">
            <p
              v-if="history.current.value?.interrupted && status === 'ready'"
              role="status"
              class="px-3 py-2 text-xs text-muted"
            >
              {{ ai.chatInterrupted }}
            </p>
            <ChatTranscript
              :messages="messages"
              :status="status"
              :show-continue="showContinue"
              :queued="queuedMessages"
              :steers="!providerID.startsWith('acp:') && providerID !== 'harness:pi'"
              @remove-queued="removeQueuedMessage"
              :nodes-live="!history.readOnly.value"
              :interactive="chat !== null && !submission.busy.value"
              @regenerate="submission.regenerate()"
              @revert="(messageId) => submission.revert(messageId)"
              @restore="(messageId) => submission.restore(messageId)"
              @edit="(messageId, text) => submission.resend(messageId, text)"
              @continue="
                submission.submit({
                  modelText: 'Continue where you left off',
                  displayText: 'Continue where you left off',
                  images: [],
                  nodes: []
                })
              "
            />

            <p v-if="agentHistoryReadOnly" role="status" class="px-3 py-2 text-xs text-muted">
              {{ ai.chatAgentReadOnly }}
            </p>
            <p v-if="history.readOnly.value" role="status" class="px-3 py-2 text-xs text-muted">
              {{ ai.chatReadOnly }}
            </p>
            <ChatRunLocation
              v-if="runLocation"
              :agent="runLocation.agent"
              :page="runLocation.page"
              @open="runLocation.open"
            />
          </template>
        </template>
      </component>
      <TabsContent
        v-if="docked"
        value="chat-history"
        :force-mount="true"
        :hidden="activePanel !== 'chat-history'"
        class="flex min-h-0 flex-1 flex-col"
      >
        <div
          class="flex items-center justify-between gap-2 border-b border-border/50 px-3 pt-2.5 pb-3.5"
        >
          <h2 class="text-[13px] font-medium text-surface">{{ ai.chatHistory }}</h2>
          <AppButton
            size="md"
            variant="outline"
            :aria-label="ai.newChat"
            :disabled="history.busy.value"
            @click="historyAction(history.newChat, true)"
          >
            <template #leading><icon-lucide-plus /></template>
            {{ menu.new }}
          </AppButton>
        </div>
        <ChatHistoryList
          inline
          :conversations="savedChats"
          :selected-id="history.current.value?.id"
          :disabled="history.busy.value"
          @select="openConversation($event, true)"
        />
      </TabsContent>
      <slot name="panel" />
    </div>
    <ChatProviderSetup
      v-if="docked && !isConfigured"
      :fill="false"
      size="compact"
      class="shrink-0 rounded-[20px] border border-island-border bg-panel"
      :ui="{
        root: 'min-h-[110px] px-4 py-3',
        content: 'w-full max-w-none items-start text-left',
        icon: 'hidden',
        action: 'mt-3 justify-start'
      }"
    />
    <div
      v-if="
        isConfigured &&
        canRunParallel &&
        !parallel &&
        !agentHistoryReadOnly &&
        !history.readOnly.value
      "
      class="flex justify-end px-2"
    >
      <AppButton
        size="sm"
        :variant="twoVersions ? 'outline' : 'ghost'"
        :aria-pressed="twoVersions"
        :disabled="submission.busy.value || history.busy.value"
        @click="twoVersions = !twoVersions"
      >
        <template #leading><icon-lucide-columns-2 /></template>
        {{ ai.parallelDesignToggle }}
      </AppButton>
    </div>
    <ChatInput
      v-if="isConfigured && !parallel && !agentHistoryReadOnly && !history.readOnly.value"
      ref="chatInput"
      :status="status"
      :dragging="draggingImages"
      :disabled="submission.busy.value || history.busy.value"
      @submit="sendOrQueue"
      @stop="handleStop"
      @interrupt="handleStop"
      @error="toast.error"
      @select-model="selectModel"
    />
    <div v-else-if="!parallel && !history.readOnly.value" class="flex justify-end px-3 pb-2">
      <ChatProfileSelect :disabled="modelSelectionDisabled" @select="selectModel" />
    </div>

    <ChatPermissionDialog v-if="isConfigured || messages.length" />
    <AppConfirmationDialog
      v-model:open="confirmModelSwitch"
      :heading="`${ai.newChat} · ${pendingModel ? (modelProfile(pendingModel.id)?.name ?? '') : ''}`"
      :description="ai.chatSwitchAgent"
      :cancel-label="common.cancel"
      :confirm-label="ai.newChat"
      @confirm="startChatWithModel"
      @close-auto-focus="restoreModelFocus"
    />
  </div>
</template>
