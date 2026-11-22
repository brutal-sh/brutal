import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

import { useI18n } from '@open-pencil/vue/i18n'

import { APP_RELEASE_VERSION } from '@/app/runtime/version'
import { setShowUpdateWindow } from '@/app/settings/preferences/store'
import { toast } from '@/app/shell/ui'
import { checkForAppUpdate, scheduleStartupUpdateCheck } from '@/app/shell/updater/check'
import {
  openUpdaterWindow,
  UPDATER_WINDOW_LABEL,
  UPDATER_WINDOW_URL
} from '@/app/shell/updater/window'

import { clearTauriMocks, mockTauriIPC } from '#tests/helpers/tauri/mocks'

const { updates: messages } = useI18n()
const originalUpdatesFlag = Object.getOwnPropertyDescriptor(
  globalThis,
  '__OPENPENCIL_UPDATES_ENABLED__'
)

beforeEach(() => {
  Object.defineProperty(globalThis, '__OPENPENCIL_UPDATES_ENABLED__', {
    configurable: true,
    writable: true,
    value: true
  })
})

const AVAILABLE_UPDATE = {
  rid: 9,
  currentVersion: '0.11.8',
  version: '0.11.9',
  date: null,
  body: '### Fixed\n\n- Release notes',
  rawJson: '{}'
}

afterEach(async () => {
  await clearTauriMocks()
  setShowUpdateWindow(true)
  for (const entry of toast.toasts.value) toast.remove(entry.id)
  if (originalUpdatesFlag)
    Object.defineProperty(globalThis, '__OPENPENCIL_UPDATES_ENABLED__', originalUpdatesFlag)
  else Reflect.deleteProperty(globalThis, '__OPENPENCIL_UPDATES_ENABLED__')
})

describe('checkForAppUpdate', () => {
  test('does not schedule an update request in a build without update endpoints', async () => {
    Object.assign(globalThis, { __OPENPENCIL_UPDATES_ENABLED__: false })
    const calls: string[] = []
    const previousToasts = toast.toasts.value.map((entry) => ({ ...entry }))
    await mockTauriIPC((cmd) => {
      calls.push(cmd)
      return null
    })

    scheduleStartupUpdateCheck(messages)
    await new Promise((resolve) => {
      setTimeout(resolve, 2600)
    })

    expect(calls).toEqual([])
    expect(toast.toasts.value).toEqual(previousToasts)
  })

  for (const enabled of [false, undefined]) {
    test(`manual ${enabled === false ? 'disabled' : 'unconfigured'} updates use unavailable guidance without contacting the plugin`, async () => {
      Object.assign(globalThis, { __OPENPENCIL_UPDATES_ENABLED__: enabled })
      const calls: string[] = []
      await mockTauriIPC((cmd) => {
        calls.push(cmd)
        return null
      })
      await checkForAppUpdate({ messages })
      expect(calls).toEqual([])
      expect(toast.toasts.value.map((entry) => entry.message)).toEqual([messages.value.unavailable])
      for (const entry of toast.toasts.value) toast.remove(entry.id)
      await checkForAppUpdate({ silent: true, messages })
      expect(calls).toEqual([])
      expect(toast.toasts.value).toEqual([])
    })
  }

  test('returns quietly when no update is available', async () => {
    const calls: string[] = []
    await mockTauriIPC((cmd) => {
      calls.push(cmd)
      return null
    })

    await checkForAppUpdate({ silent: true, messages })

    expect(calls).toEqual(['plugin:updater|check'])
    expect(toast.toasts.value).toEqual([])
  })

  test('shows the installed release notes when the app is up to date', async () => {
    setShowUpdateWindow(false)
    await mockTauriIPC(() => null)

    await checkForAppUpdate({ messages })

    expect(toast.toasts.value).toHaveLength(1)
    const [notice] = toast.toasts.value
    expect(notice?.message).toBe(messages.value.upToDate)
    expect(notice?.action).toEqual({
      label: messages.value.fullReleaseNotes,
      href: `https://github.com/brutal-sh/brutal-feedback/releases/tag/v${APP_RELEASE_VERSION}`
    })
  })

  test('opens the Software Update window for an available update', async () => {
    const calls: Array<{ cmd: string; args: unknown }> = []
    await mockTauriIPC((cmd, args) => {
      calls.push({ cmd, args })
      if (cmd === 'plugin:updater|check') return AVAILABLE_UPDATE
      if (cmd === 'plugin:window|get_all_windows') return ['main']
      return null
    })

    await checkForAppUpdate({ silent: true, messages })

    const created = calls.find((call) => call.cmd === 'plugin:webview|create_webview_window')
    expect(created?.args).toMatchObject({
      options: {
        label: UPDATER_WINDOW_LABEL,
        url: UPDATER_WINDOW_URL,
        title: messages.value.windowTitle
      }
    })
    // The window checks again for its own handle; this one is released.
    expect(calls.map((call) => call.cmd)).toContain('plugin:resources|close')
  })

  test('opens one Software Update window for overlapping manual checks', async () => {
    const calls: string[] = []
    await mockTauriIPC((cmd) => {
      calls.push(cmd)
      if (cmd === 'plugin:window|get_all_windows') return ['main']
      return null
    })

    await Promise.all([checkForAppUpdate({ messages }), checkForAppUpdate({ messages })])

    expect(calls.filter((cmd) => cmd === 'plugin:webview|create_webview_window')).toHaveLength(1)
    expect(calls).not.toContain('plugin:updater|check')
    expect(toast.toasts.value).toEqual([])
  })

  test('offers the update window as an action when the window preference is off', async () => {
    setShowUpdateWindow(false)
    const calls: string[] = []
    let opened: (() => void) | undefined
    const windowCreated = new Promise<void>((resolve) => {
      opened = resolve
    })
    await mockTauriIPC((cmd) => {
      calls.push(cmd)
      if (cmd === 'plugin:updater|check') return AVAILABLE_UPDATE
      if (cmd === 'plugin:window|get_all_windows') return ['main']
      if (cmd === 'plugin:webview|create_webview_window') opened?.()
      return null
    })

    await checkForAppUpdate({ silent: true, messages })

    expect(calls).not.toContain('plugin:webview|create_webview_window')
    const [notice] = toast.toasts.value
    expect(notice?.message).toBe(messages.value.available({ version: AVAILABLE_UPDATE.version }))
    expect(notice?.action?.label).toBe(messages.value.windowTitle)
    if (!notice?.action || !('run' in notice.action)) throw new Error('Missing update action')
    notice.action.run()
    await windowCreated
    await openUpdaterWindow(messages.value.windowTitle)
    expect(calls.filter((cmd) => cmd === 'plugin:webview|create_webview_window')).toHaveLength(1)
  })

  test('focuses the Software Update window when it is already open', async () => {
    const calls: string[] = []
    await mockTauriIPC((cmd) => {
      calls.push(cmd)
      if (cmd === 'plugin:updater|check') return AVAILABLE_UPDATE
      if (cmd === 'plugin:window|get_all_windows') return ['main', UPDATER_WINDOW_LABEL]
      return null
    })

    await checkForAppUpdate({ messages })

    expect(calls).toContain('plugin:window|set_focus')
    expect(calls).not.toContain('plugin:webview|create_webview_window')
  })

  test('reports a window creation failure and allows another attempt', async () => {
    let attempts = 0
    await mockTauriIPC((cmd) => {
      if (cmd === 'plugin:window|get_all_windows') return ['main']
      if (cmd === 'plugin:webview|create_webview_window' && ++attempts === 1)
        throw new Error('window creation failed')
      return null
    })

    await checkForAppUpdate({ messages })
    expect(toast.toasts.value.map((entry) => entry.message)).toEqual([
      messages.value.checkFailed({ error: 'window creation failed' })
    ])

    await checkForAppUpdate({ messages })
    expect(attempts).toBe(2)
  })

  test('reports a failed check from the menu', async () => {
    setShowUpdateWindow(false)
    await mockTauriIPC((cmd) => {
      if (cmd === 'plugin:updater|check') throw new Error('offline')
      return null
    })

    await checkForAppUpdate({ messages })

    expect(toast.toasts.value.map((entry) => entry.message)).toEqual([
      messages.value.checkFailed({ error: 'offline' })
    ])
  })
})
