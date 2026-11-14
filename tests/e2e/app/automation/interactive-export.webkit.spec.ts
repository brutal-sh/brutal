import { writeFile } from 'node:fs/promises'

import { expect, test, useEditorSetupWithClear } from '#tests/e2e/fixtures'
import { liveTestDiscovery } from '#tests/helpers/automation/cli/bridge'
import {
  activateOwnedDocument,
  documentSnapshot,
  openOwnedDocuments,
  ownedRendererReady
} from '#tests/helpers/automation/cli/documents'
import { decodeOwnedPNG, readCLIImage } from '#tests/helpers/automation/cli/images'
import { runLiveCLI } from '#tests/helpers/automation/cli/process'

const editor = useEditorSetupWithClear('/?test')

test('a connected export refuses a missing renderer then decodes the intended active document', async () => {
  const discovery = await liveTestDiscovery(editor.page)
  const ids = await openOwnedDocuments(editor.page)
  const first = ids.at(0)
  if (!first) throw new Error('Owned document unavailable')
  const before = await Promise.all(ids.map((id) => documentSnapshot(editor.page, id)))
  const args = ['interactive', '-a', 'desktop', '--document-id', first]
  const call = "export_image({ids:['owned-a'],format:'PNG',scale:1})\nexit()\n"
  expect(await ownedRendererReady(editor.page, first)).toBe(false)
  const refused = await runLiveCLI(discovery, args, call)
  expect(refused.exitCode).toBe(1)
  expect(refused.stderr.length).toBeGreaterThan(0)
  expect(await Promise.all(ids.map((id) => documentSnapshot(editor.page, id)))).toEqual(before)
  await activateOwnedDocument(editor.page, first)
  await expect.poll(() => ownedRendererReady(editor.page, first)).toBe(true)
  const result = await runLiveCLI(discovery, args, call)
  expect(result.exitCode, result.stderr).toBe(0)
  expect(result.stderr).toBe('')
  const image = readCLIImage(result.stdout)
  expect([image.width, image.height]).toEqual([64, 64])
  await writeFile(test.info().outputPath('owned-live-export.png'), image.bytes)
  await test
    .info()
    .attach('owned-live-export', { body: Buffer.from(image.bytes), contentType: 'image/png' })
  const decoded = await decodeOwnedPNG(editor.page, image.bytes)
  expect([decoded.width, decoded.height]).toEqual([64, 64])
  const color = [51, 102, 153, 255]
  expect(decoded.pixels).toEqual(
    Array.from({ length: 64 * 64 * 4 }, (_, index) => color[index % 4])
  )
  expect(await Promise.all(ids.map((id) => documentSnapshot(editor.page, id)))).toEqual(before)
  editor.canvas.assertNoErrors()
})
