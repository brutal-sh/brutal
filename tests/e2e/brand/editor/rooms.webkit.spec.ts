import { expect, test } from '@playwright/test'

import { mockEditorCopyServices } from '#tests/helpers/brand/editor-services'
import { CanvasHelper } from '#tests/helpers/canvas'
import { relayURLFor, roomLinkPath, startRelay } from '#tests/helpers/collab/room'

const LOCALES = [
  {
    locale: 'en',
    description:
      'Check your internet connection. Open Pen keeps trying and opens the file once it connects.'
  },
  {
    locale: 'de',
    description:
      'Prüfe deine Internetverbindung. Open Pen versucht es weiter und öffnet die Datei, sobald die Verbindung steht.'
  },
  {
    locale: 'es',
    description:
      'Comprueba tu conexión a internet. Open Pen sigue intentándolo y abrirá el archivo en cuanto se conecte.'
  },
  {
    locale: 'fr',
    description:
      'Vérifiez votre connexion internet. Open Pen continue d’essayer et ouvrira le fichier dès la connexion établie.'
  },
  {
    locale: 'it',
    description:
      'Controlla la connessione a internet. Open Pen continua a provare e aprirà il file appena si connette.'
  },
  {
    locale: 'ja',
    description:
      'インターネット接続を確認してください。Open Pen は接続を試み続け、接続できしだいファイルを開きます。'
  },
  {
    locale: 'pl',
    description:
      'Sprawdź połączenie z internetem. Open Pen próbuje dalej i otworzy plik, gdy tylko się połączy.'
  },
  {
    locale: 'ru',
    description:
      'Проверьте подключение к интернету. Open Pen продолжает попытки и откроет файл, как только подключится.'
  },
  {
    locale: 'zh-CN',
    description: '请检查网络连接。Open Pen 会继续尝试，连接后即打开文件。'
  }
] as const

for (const { locale, description } of LOCALES) {
  test.describe(locale, () => {
    test.use({ locale })
    test(`unreachable room guidance identifies Open Pen in ${locale}`, async ({
      page
    }, testInfo) => {
      const relay = await startRelay()
      try {
        const interceptedURLs = await mockEditorCopyServices(page)
        // Advance the actual room timeout after a real local relay disconnect, without waiting 20s.
        await page.clock.install()
        const canvas = new CanvasHelper(page)
        const connected = page.waitForEvent('websocket', (socket) =>
          socket.url().startsWith(relay.url)
        )
        await page.goto(relayURLFor(roomLinkPath(), relay.url))
        const socket = await connected
        const screen = page.getByTestId('room-screen')
        await expect(screen).toHaveAttribute('data-status', /^(looking|waiting)$/)
        await relay.disconnectPeers()
        await expect.poll(() => socket.isClosed()).toBe(true)
        await page.clock.fastForward(21_000)
        await expect(screen).toHaveAttribute('data-status', 'unreachable')
        await expect(screen).toContainText(description)
        const guidance = screen.getByText(description, { exact: true })
        expect(
          await guidance.evaluate((element) => element.scrollWidth <= element.clientWidth)
        ).toBe(true)
        await screen.screenshot({ path: testInfo.outputPath('room-unreachable.png') })
        await page.getByTestId('room-screen-leave').click()
        await expect(screen).toHaveCount(0)
        expect(interceptedURLs).toEqual([])
        canvas.assertNoErrors()
      } finally {
        await relay.close()
      }
    })
  })
}
