import { invoke } from '@tauri-apps/api/core'
import * as v from 'valibot'

import { aiMessages } from '@open-pencil/vue/i18n'

import { openExternalLink } from '@/app/shell/ui'
import { tauriFetch } from '@/app/tauri/http'

import {
  startSignIn,
  type SignIn,
  type SignInCallback,
  type SignInFailure
} from '../sign-in/attempt'
import { loopbackOutcomeSchema } from '../sign-in/schema'
import type { ChatGPTCredential } from './credential'
import { chatGPTAuthorizationURL, exchangeChatGPTCode } from './oauth'

export type ChatGPTSignInFailure = SignInFailure | 'port-in-use'
export type ChatGPTSignIn = SignIn<ChatGPTCredential, 'port-in-use'>

/**
 * Takes the loopback port the redirect returns to before the page opens; the desktop shell
 * checks the state and answers the browser.
 */
async function loopbackCallback(
  state: string
): Promise<SignInCallback | { failure: 'port-in-use' }> {
  const ai = aiMessages.get()
  // The browser shows these after the redirect, so they come in the app's language.
  const pages = {
    signedIn: ai.aiSetupChatGPTCallbackSignedIn,
    cancelled: ai.aiSetupChatGPTCallbackCancelled,
    stale: ai.aiSetupChatGPTCallbackStale
  }
  try {
    await invoke('chatgpt_oauth_listen', { state, pages })
  } catch (error) {
    if (error === 'port-in-use') return { failure: 'port-in-use' }
    throw error
  }
  return {
    open: openExternalLink,
    wait: async () => v.parse(loopbackOutcomeSchema, await invoke('chatgpt_oauth_wait')),
    // Frees the port; the state keeps a late cancel from ending a newer attempt.
    close: () => void invoke('chatgpt_oauth_cancel', { state }).catch(() => undefined)
  }
}

/** Signs in to ChatGPT in the system browser; the browser app cannot receive the redirect. */
export function signInWithChatGPT(signal: AbortSignal): ChatGPTSignIn {
  return startSignIn({
    signal,
    callback: loopbackCallback,
    authorizationURL: chatGPTAuthorizationURL,
    exchange: (code, verifier) => exchangeChatGPTCode(code, verifier, tauriFetch)
  })
}
