import { promiseTimeout } from '@vueuse/core'
import type { Ref } from 'vue'

import { APP_RELEASE_VERSION } from '@/app/runtime/version'
import { appPreferences } from '@/app/settings/preferences/store'
import { brutalReleaseNotesURL } from '@/app/shell/support/links'
import { toast } from '@/app/shell/ui'
import { isTauri } from '@/app/tauri/env'

import { updateFailureText, type UpdaterMessages } from './messages'
import { openUpdaterWindow } from './window'

const STARTUP_UPDATE_CHECK_DELAY_MS = 2500

interface UpdateCheckOptions {
  silent?: boolean
  messages: Ref<UpdaterMessages>
}

let startupCheckStarted = false
let backgroundCheck: Promise<void> | null = null
let reportBackgroundResult = false

export function appUpdatesAvailable(): boolean {
  return (
    isTauri() &&
    typeof __OPENPENCIL_UPDATES_ENABLED__ !== 'undefined' &&
    __OPENPENCIL_UPDATES_ENABLED__
  )
}

export async function checkForAppUpdate(options: UpdateCheckOptions) {
  if (!isTauri()) return
  const { silent = false, messages } = options
  if (!appUpdatesAvailable()) {
    if (!silent) toast.info(messages.value.unavailable)
    return
  }
  if (!silent && appPreferences.value.updates.showWindow) {
    return showUpdateWindow(messages.value)
  }

  if (!silent) reportBackgroundResult = true
  backgroundCheck ??= runBackgroundCheck(messages).finally(() => {
    backgroundCheck = null
    reportBackgroundResult = false
  })
  return backgroundCheck
}

export function scheduleStartupUpdateCheck(messages: Ref<UpdaterMessages>) {
  if (startupCheckStarted || !appUpdatesAvailable()) return
  startupCheckStarted = true
  void promiseTimeout(STARTUP_UPDATE_CHECK_DELAY_MS).then(() =>
    checkForAppUpdate({ silent: true, messages })
  )
}

async function showUpdateWindow(messages: UpdaterMessages) {
  try {
    await openUpdaterWindow(messages.windowTitle)
  } catch (error) {
    reportCheckFailure(messages, error)
  }
}

function reportCheckFailure(messages: UpdaterMessages, error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  toast.warning(updateFailureText(messages, 'check', message))
}

// The Software Update window owns the handle used to install the release.
async function runBackgroundCheck(messages: Ref<UpdaterMessages>) {
  try {
    const { check } = await import('@tauri-apps/plugin-updater')
    const update = await check()
    if (!update) {
      if (reportBackgroundResult) {
        toast.info(messages.value.upToDate, {
          label: messages.value.fullReleaseNotes,
          href: brutalReleaseNotesURL(APP_RELEASE_VERSION)
        })
      }
      return
    }
    await update.close()
    if (appPreferences.value.updates.showWindow) {
      await openUpdaterWindow(messages.value.windowTitle)
    } else {
      toast.info(messages.value.available({ version: update.version }), {
        label: messages.value.windowTitle,
        run: () => void showUpdateWindow(messages.value)
      })
    }
  } catch (error) {
    if (reportBackgroundResult) reportCheckFailure(messages.value, error)
  }
}
