import { ref } from 'vue'

import { ACP_AGENTS, IS_BROWSER } from '@open-pencil/core/constants'
import type { AIProviderID } from '@open-pencil/core/constants'

import { createConversationHistory } from '@/app/ai/chat/history/controller'
import { createChatSessionManager } from '@/app/ai/chat/session'
import {
  apiKeyStatus,
  browserCredentialsRemembered,
  credentialsReady,
  customAPIType,
  customBaseURL,
  customModelID,
  isACPProvider,
  isHarnessProvider,
  isConfigured,
  maxOutputTokens,
  modelID,
  providerDef,
  providerID,
  registerAIChatEffects,
  resolveAPIKey,
  setAPIKey
} from '@/app/ai/chat/storage'
import { designModelProfile } from '@/app/ai/models'
import { exposeChatTransportOverride } from '@/app/browser-bridge'
import { getActiveEditorStore } from '@/app/editor/active-store'
import {
  pexelsKeyStatus,
  unsplashKeyStatus,
  setPexelsKey,
  setUnsplashKey,
  setRememberCredentials
} from '@/app/settings/credentials/media'

export type PropertiesTab = 'design' | 'code' | 'ai' | 'lint'

const activeTab = ref<PropertiesTab>('design')
const advancedProperties = ref(false)

const chatSession = createChatSessionManager({
  isConfigured,
  isACPProvider,
  isHarnessProvider,
  providerID,
  credentialsReady,
  getActiveEditorStore
})

function backendForProvider(provider: AIProviderID) {
  if (provider.startsWith('acp:')) return 'acp'
  return provider === 'harness:pi' ? 'harness' : 'direct'
}

function resumingAgentForProvider(provider: AIProviderID) {
  return (
    ACP_AGENTS.find((agent) => agent.resumesSessions && provider === `acp:${agent.id}`)?.id ?? null
  )
}

const history = createConversationHistory({
  profileId: () => designModelProfile.value?.id ?? null,
  getEditor: getActiveEditorStore,
  ensureChat: chatSession.ensureChat,
  resetChat: chatSession.resetChat,
  backend: () => backendForProvider(providerID.value),
  resumingAgent: () => resumingAgentForProvider(providerID.value)
})

function canContinueWithProvider(provider: AIProviderID) {
  return history.canContinueWith(backendForProvider(provider), resumingAgentForProvider(provider))
}

registerAIChatEffects(chatSession.markTransportDirty)

if (IS_BROWSER) {
  exposeChatTransportOverride((factory) => {
    chatSession.setOverrideTransport(factory)
  })
}

export function useAIChat() {
  return {
    providerID,
    providerDef,
    apiKeyStatus,
    browserCredentialsRemembered,
    setAPIKey,
    resolveAPIKey,
    modelID,
    customBaseURL,
    customModelID,
    customAPIType,
    maxOutputTokens,
    pexelsKeyStatus,
    setPexelsKey,
    setRememberCredentials,
    unsplashKeyStatus,
    setUnsplashKey,
    activeTab,
    advancedProperties,
    isConfigured,
    history,
    canContinueWithProvider,
    ensureChat: history.ensureChat,
    resetChat: history.newChat,
    chatFailure: chatSession.failure,
    clearChatFailure: chatSession.clearFailure
  }
}
