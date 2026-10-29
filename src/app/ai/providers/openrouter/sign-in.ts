import { IS_TAURI } from '@open-pencil/core/constants'

import { createDeferred } from '@/app/runtime/deferred'

import {
  callbackOutcome,
  startSignIn,
  type CallbackOutcome,
  type SignIn,
  type SignInCallback,
  type SignInFailure
} from '../sign-in/attempt'
import { openRouterLoopback } from './loopback'
import {
  exchangeOpenRouterCode,
  openRouterAuthorizationURL,
  OPENROUTER_CODE_LIFETIME_MS
} from './oauth'

/** Served from `public/`; it relays the redirect to the editor over this channel. */
export const OPENROUTER_CALLBACK_PATH = '/oauth/openrouter.html'
export const OPENROUTER_CALLBACK_CHANNEL = 'open-pencil:openrouter-oauth'
const POPUP_NAME = 'open-pencil-openrouter'
const POPUP_FEATURES = 'popup,width=520,height=720'

export type OpenRouterSignInFailure = SignInFailure | 'blocked'
export type OpenRouterSignIn = SignIn<string, 'blocked'>

export interface OpenRouterSignInOptions {
  signal: AbortSignal
  /** Prefills the name of the key OpenRouter creates. */
  keyLabel: string
}

/** A redirect that resolves once, or as expired when the code's lifetime passes. */
function pendingRedirect() {
  const received = createDeferred<CallbackOutcome>()
  const timer = setTimeout(() => received.resolve({ kind: 'expired' }), OPENROUTER_CODE_LIFETIME_MS)
  return { received, stop: () => clearTimeout(timer) }
}

/**
 * A popup that returns to this origin, whose callback page relays the redirect query. The popup
 * opens before anything is awaited, or the browser blocks it.
 */
function popupCallback(state: string): Promise<SignInCallback | { failure: 'blocked' }> {
  const opened = window.open('', POPUP_NAME, POPUP_FEATURES)
  if (!opened) return Promise.resolve({ failure: 'blocked' })
  let popup = opened
  let navigated = false
  const { received, stop } = pendingRedirect()
  const channel = new BroadcastChannel(OPENROUTER_CALLBACK_CHANNEL)
  channel.addEventListener('message', (event: MessageEvent<unknown>) => {
    if (typeof event.data === 'string') received.resolve(callbackOutcome(event.data, state))
  })
  return Promise.resolve({
    open: (url) => {
      if (navigated) popup = window.open(url, POPUP_NAME, POPUP_FEATURES) ?? popup
      else popup.location.href = url
      navigated = true
    },
    wait: () => received.promise,
    close: () => {
      stop()
      channel.close()
      popup.close()
    }
  })
}

/** Signs in to OpenRouter with OAuth PKCE and returns a new API key for this app. */
export function signInWithOpenRouter({
  signal,
  keyLabel
}: OpenRouterSignInOptions): OpenRouterSignIn {
  let callbackURL = IS_TAURI ? '' : new URL(OPENROUTER_CALLBACK_PATH, window.location.origin).href
  return startSignIn({
    signal,
    callback: IS_TAURI
      ? async (state) => {
          const loopback = await openRouterLoopback(state)
          callbackURL = loopback.callbackURL
          return loopback.callback
        }
      : popupCallback,
    authorizationURL: (pkce) => openRouterAuthorizationURL(callbackURL, pkce, keyLabel),
    exchange: (code, verifier) => exchangeOpenRouterCode(code, verifier)
  })
}
