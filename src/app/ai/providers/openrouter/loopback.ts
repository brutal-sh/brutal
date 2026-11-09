import { invoke } from '@tauri-apps/api/core'
import * as v from 'valibot'

import { aiMessages } from '@open-pencil/vue/i18n'

import { openExternalLink } from '@/app/shell/ui'

import type { SignInCallback } from '../sign-in/attempt'
import { loopbackOutcomeSchema } from '../sign-in/schema'
import { loopbackURLSchema } from './schema'

/** Reuses the native state-checked listener on a free port; no hosted relay receives the code. */
export async function openRouterLoopback(state: string): Promise<{
  callbackURL: string
  callback: SignInCallback
}> {
  const ai = aiMessages.get()
  try {
    const callbackURL = v.parse(
      loopbackURLSchema,
      await invoke('chatgpt_oauth_listen', {
        state,
        provider: 'openrouter',
        pages: {
          signedIn: ai.aiSetupOpenRouterSignedInTitle,
          cancelled: ai.aiSetupSignInCancelled,
          stale: ai.aiSetupOpenRouterFailed
        }
      })
    )
    return {
      callbackURL,
      callback: {
        open: openExternalLink,
        wait: async () => v.parse(loopbackOutcomeSchema, await invoke('chatgpt_oauth_wait')),
        close: () => void invoke('chatgpt_oauth_cancel', { state }).catch(() => undefined)
      }
    }
  } catch (error) {
    await invoke('chatgpt_oauth_cancel', { state }).catch(() => undefined)
    throw error
  }
}
