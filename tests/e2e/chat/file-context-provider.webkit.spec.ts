import { expect, test, type Page } from '@playwright/test'
import * as v from 'valibot'

import { CanvasHelper } from '#tests/helpers/canvas'
import { routeModelCatalog } from '#tests/helpers/chat/catalog'
import { ChatHarness } from '#tests/helpers/chat/harness'

const requestSchema = v.pipe(
  v.string(),
  v.parseJson(),
  v.object({
    messages: v.array(v.object({ role: v.string(), content: v.unknown() }))
  })
)

const filesSchema = v.pipe(
  v.string(),
  v.parseJson(),
  v.array(v.object({ name: v.string(), mediaType: v.string(), text: v.string() }))
)

async function interceptProvider(page: Page) {
  const received: v.InferOutput<typeof requestSchema>[] = []
  await page.route('https://openrouter.ai/api/v1/chat/completions', async (route) => {
    const parsed = v.safeParse(requestSchema, route.request().postData())
    if (!parsed.success) throw new Error('Invalid serialized provider request')
    received.push(parsed.output)
    const chunk = (delta: object, finish: string | null) =>
      `data: ${JSON.stringify({
        id: 'local-file-context',
        object: 'chat.completion.chunk',
        created: 0,
        model: 'test/model',
        choices: [{ index: 0, delta, finish_reason: finish }]
      })}\n\n`
    await route.fulfill({
      contentType: 'text/event-stream',
      body:
        chunk({ role: 'assistant', content: 'Local context received.' }, null) +
        chunk({}, 'stop') +
        'data: [DONE]\n\n'
    })
  })
  return received
}

test('the production transport serializes source context to its intercepted provider request', async ({
  page
}, info) => {
  await routeModelCatalog(page)
  const received = await interceptProvider(page)
  const chat = new ChatHarness(page)
  await chat.open()
  await new CanvasHelper(page).waitForInit()
  await chat.configureOpenRouter('sk-or-synthetic-local-only')
  const fixture = {
    name: 'owned-source.ts',
    type: 'text/typescript',
    text: 'export const label = "Meadow 🟢";\r\n'
  }
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Add image or file', exact: true }).click()
  await (
    await chooser
  ).setFiles({ name: fixture.name, mimeType: fixture.type, buffer: Buffer.from(fixture.text) })
  await expect(page.getByText(fixture.name, { exact: true })).toBeVisible()
  await chat.submit('Inspect this source without changing the canvas')
  await expect(chat.assistantMessage()).toContainText('Local context received.')
  expect(received).toHaveLength(1)
  const request = received[0].messages.findLast((entry) => entry.role === 'user')
  const content = v.safeParse(
    v.union([v.string(), v.array(v.object({ type: v.literal('text'), text: v.string() }))]),
    request?.content
  )
  if (!content.success) throw new Error('Missing user text at provider boundary')
  const text =
    typeof content.output === 'string'
      ? content.output
      : content.output.map((part) => part.text).join('')
  const files = v.safeParse(filesSchema, text.split('\n').at(-1))
  if (!files.success) throw new Error('Missing attached source at provider boundary')
  expect(files.output).toEqual([
    { name: fixture.name, mediaType: fixture.type, text: fixture.text }
  ])
  await info.attach('serialized-provider-request', {
    body: JSON.stringify(received[0], null, 2),
    contentType: 'application/json'
  })
})
