import { readFile } from 'node:fs/promises'

import { expect, test, type Page, type TestInfo } from '@playwright/test'
import * as v from 'valibot'

import type * as DiagnosticsStorage from '@/app/diagnostics/idb'
import type { DiagnosticEvent } from '@/app/diagnostics/types'

import { CanvasHelper } from '#tests/helpers/canvas'

const reportSchema = v.pipe(
  v.string(),
  v.parseJson(),
  v.object({
    environment: v.object({ app: v.string(), shell: v.literal('browser') }),
    events: v.array(
      v.object({ id: v.string(), name: v.string(), attributes: v.record(v.string(), v.unknown()) })
    )
  })
)

// Synthetic canaries only; no provider, real credential, or private user document is used.
const fakeCredentials = { api_key: 'plum42', password: 'orchid glade', session_token: 'cedar17' }
const privateDesignName = 'Private design canary 904'
const model = 'meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo'

async function start(page: Page) {
  await page.addInitScript(() => {
    window.showSaveFilePicker = undefined
  })
  await page.goto('/?test')
  await new CanvasHelper(page).waitForInit()
}

async function openSyntheticDesign(page: Page) {
  await page.evaluate((name) => {
    const data = JSON.stringify({
      version: '2.21',
      children: [
        {
          id: 'private-fixture',
          type: 'rectangle',
          name,
          x: 0,
          y: 0,
          width: 80,
          height: 60
        }
      ]
    })
    const transfer = new DataTransfer()
    transfer.items.add(
      new File([data], 'Synthetic private design.pen', { type: 'application/json' })
    )
    window.dispatchEvent(new DragEvent('drop', { dataTransfer: transfer, cancelable: true }))
  }, privateDesignName)
  await page.waitForFunction(() => window.openPencil?.getStore?.().graph.getNode('private-fixture'))
}

async function downloadReport(page: Page, info: TestInfo, name: string) {
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+,' : 'Control+,')
  await page.getByTestId('settings-section-diagnostics').click()
  const panel = page.getByTestId('settings-diagnostics-panel')
  await expect(panel.getByRole('button', { name: /Error: TypeError/ })).toBeVisible()
  await panel.screenshot({ path: info.outputPath(`${name}-diagnostics.png`) })
  const downloading = page.waitForEvent('download')
  await panel.getByRole('button', { name: 'Save diagnostics…', exact: true }).click()
  const download = await downloading
  expect(download.suggestedFilename()).toBe('Brutal diagnostics.json')
  const path = info.outputPath(`${name}.json`)
  await download.saveAs(path)
  const text = await readFile(path, 'utf8')
  const parsed = v.safeParse(reportSchema, text)
  if (!parsed.success) throw new Error(v.summarize(parsed.issues))
  return { text, report: parsed.output }
}

function expectSafe(result: Awaited<ReturnType<typeof downloadReport>>) {
  expect(result.report.environment.app).toMatch(/^\d+\.\d+\.\d+/)
  const runtime = result.report.events.find((event) => event.name === 'runtime.error')
  expect(runtime?.attributes).toMatchObject({ source: 'window', errorName: 'TypeError' })
  for (const canary of ['plum42', 'orchid', 'glade', 'cedar17', privateDesignName])
    expect(result.text).not.toContain(canary)
  expect(String(runtime?.attributes.message)).toContain('[redacted]')
}

test('downloaded support diagnostics redact quoted credentials and exclude the open design', async ({
  page
}, info) => {
  await start(page)
  await openSyntheticDesign(page)
  await page.evaluate((credentials) => {
    setTimeout(() => {
      throw new TypeError(`Settings failure ${JSON.stringify(credentials)}`)
    })
  }, fakeCredentials)
  expectSafe(await downloadReport(page, info, 'support-report'))
})

async function legacyStore(page: Page, event?: DiagnosticEvent) {
  return page.evaluate(async (record) => {
    const path = '/src/app/diagnostics/idb.ts'
    const storage: typeof DiagnosticsStorage = await import(path)
    const store = storage.createIDBDiagnosticsStore()
    if (record) await store.record(record)
    return (await store.list()).find((entry) => entry.id === 'legacy-support-event')
  }, event)
}

test('support exports scrub retained legacy errors across reload without rewriting local evidence', async ({
  page
}, info) => {
  await start(page)
  const legacy: DiagnosticEvent = {
    id: 'legacy-support-event',
    timestamp: 1,
    category: 'runtime',
    level: 'error',
    name: 'runtime.error',
    attributes: {
      source: 'window',
      errorName: 'TypeError',
      model,
      message: JSON.stringify(fakeCredentials)
    }
  }
  await legacyStore(page, legacy)
  for (const round of [0, 1]) {
    if (round) {
      await page.reload()
      await new CanvasHelper(page).waitForInit()
    }
    const result = await downloadReport(page, info, `legacy-report-${round}`)
    expectSafe(result)
    expect(result.report.events.find((event) => event.id === legacy.id)?.attributes.model).toBe(
      model
    )
    expect(await legacyStore(page)).toEqual(legacy)
  }
})
