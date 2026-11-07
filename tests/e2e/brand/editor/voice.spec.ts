import { expect, test } from '@playwright/test'

import { mockEditorCopyServices } from '#tests/helpers/brand/editor-services'
import { CanvasHelper } from '#tests/helpers/canvas'
import { relayURLFor, share, startRelay, type Peer } from '#tests/helpers/collab/room'
import { FAKE_MICROPHONE_ARGS, voicePopover } from '#tests/helpers/collab/voice'

// A synthetic device with an actual Chromium denial; never opens the real microphone.
test.use({ launchOptions: { args: FAKE_MICROPHONE_ARGS } })

const LOCALES = [
  {
    locale: 'en',
    start: 'Start voice call',
    description:
      'Allow Open Pen to use the microphone in your browser or system settings, then try again.'
  },
  {
    locale: 'de',
    start: 'Sprachanruf starten',
    description:
      'Erlaube Open Pen in den Browser- oder Systemeinstellungen, das Mikrofon zu verwenden, und versuche es erneut.'
  },
  {
    locale: 'es',
    start: 'Iniciar llamada de voz',
    description:
      'Permite que Open Pen use el micrófono en la configuración del navegador o del sistema y vuelve a intentarlo.'
  },
  {
    locale: 'fr',
    start: 'Démarrer un appel vocal',
    description:
      'Autorisez Open Pen à utiliser le microphone dans les réglages du navigateur ou du système, puis réessayez.'
  },
  {
    locale: 'it',
    start: 'Avvia chiamata vocale',
    description:
      'Consenti a Open Pen di usare il microfono nelle impostazioni del browser o del sistema, poi riprova.'
  },
  {
    locale: 'ja',
    start: '音声通話を開始',
    description:
      'ブラウザまたはシステムの設定で Open Pen にマイクの使用を許可してから、もう一度お試しください。'
  },
  {
    locale: 'pl',
    start: 'Rozpocznij rozmowę głosową',
    description:
      'Zezwól Open Pen na używanie mikrofonu w ustawieniach przeglądarki lub systemu, a następnie spróbuj ponownie.'
  },
  {
    locale: 'ru',
    start: 'Начать голосовой звонок',
    description:
      'Разрешите Open Pen использовать микрофон в настройках браузера или системы и попробуйте снова.'
  },
  {
    locale: 'zh-CN',
    start: '开始语音通话',
    description: '请在浏览器或系统设置中允许 Open Pen 使用麦克风，然后重试。'
  }
] as const

for (const { locale, start, description } of LOCALES) {
  test.describe(locale, () => {
    test.use({ locale })
    test(`blocked microphone guidance identifies Open Pen in ${locale}`, async ({
      page
    }, testInfo) => {
      const relay = await startRelay()
      try {
        const interceptedURLs = await mockEditorCopyServices(page)
        const canvas = new CanvasHelper(page)
        await page.goto(relayURLFor('/', relay.url))
        await canvas.waitForInit()
        const peer: Peer = { page, context: page.context(), canvas }
        const cdp = await peer.context.newCDPSession(page)
        await cdp.send('Browser.setPermission', {
          permission: { name: 'microphone' },
          setting: 'denied',
          origin: new URL(page.url()).origin
        })
        await share(peer)
        const trigger = page
          .getByTestId('voice-call')
          .getByRole('button', { name: start, exact: true })
        await trigger.click()
        const popover = voicePopover(page)
        await popover.getByRole('button', { name: start, exact: true }).click()
        const alert = popover.getByRole('alert')
        await expect(alert).toContainText(description)
        expect(await alert.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
          true
        )
        await expect(trigger).toBeVisible()
        await popover.screenshot({ path: testInfo.outputPath('microphone-denied.png') })
        expect(interceptedURLs).toEqual([])
        canvas.assertNoErrors()
      } finally {
        await relay.close()
      }
    })
  })
}
