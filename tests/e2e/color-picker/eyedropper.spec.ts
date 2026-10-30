import { expect, test, useEditorSetupWithClear } from '#tests/e2e/fixtures'
import { readScenePixels } from '#tests/helpers/canvas/pixels'
import { propertySection } from '#tests/helpers/properties'

const editor = useEditorSetupWithClear()

async function openColor() {
  await editor.canvas.drawRect(300, 300, 120, 80)
  await propertySection(editor.page, 'Fill')
    .getByRole('button', { name: 'Fill', exact: true })
    .click()
  return editor.page.locator('[data-picker-content]')
}

test('screen sample changes the paint, renders, and undoes once', async () => {
  await editor.page.evaluate(() => {
    window.EyeDropper = class {
      async open() {
        return { sRGBHex: '#123456' }
      }
    }
  })
  const popup = await openColor()
  await popup.getByRole('button', { name: 'Pick color from screen' }).click()
  await expect(
    propertySection(editor.page, 'Fill').getByRole('textbox', { name: 'Fill', exact: true })
  ).toHaveValue('123456')
  await editor.page.keyboard.press('Escape')
  await expect
    .poll(() => readScenePixels(editor.page, [{ x: 330, y: 330 }]))
    .toEqual([[18, 52, 86, 255]])
  await editor.canvas.undo()
  await expect(
    propertySection(editor.page, 'Fill').getByRole('textbox', { name: 'Fill', exact: true })
  ).toHaveValue('D9D9D9')
  editor.canvas.assertNoErrors()
})

for (const outcome of ['cancel', 'failure', 'invalid'] as const) {
  test(`screen sampler ${outcome} preserves the paint and reports only failures`, async () => {
    await editor.page.evaluate((outcome) => {
      window.EyeDropper = class {
        async open() {
          if (outcome === 'cancel') throw new DOMException('Cancelled', 'AbortError')
          if (outcome === 'failure') throw new Error('Sampler unavailable')
          return { sRGBHex: 'not-a-color' }
        }
      }
    }, outcome)
    const popup = await openColor()
    await popup.getByRole('button', { name: 'Pick color from screen' }).click()
    await expect(popup.getByRole('button', { name: 'Pick color from screen' })).toBeEnabled()
    await expect(
      propertySection(editor.page, 'Fill').getByRole('textbox', { name: 'Fill', exact: true })
    ).toHaveValue('D9D9D9')
    await expect(popup.getByText('Eyedropper failed', { exact: true })).toHaveCount(
      outcome === 'cancel' ? 0 : 1
    )
    await editor.page.keyboard.press('Escape')
    editor.canvas.assertNoErrors()
  })
}

test('a dismissed sampler cannot recolor a later selection', async () => {
  const pending = await editor.page.evaluateHandle(() => {
    let finish: ((value: { sRGBHex: string }) => void) | undefined
    const result = new Promise<{ sRGBHex: string }>((resolve) => {
      finish = resolve
    })
    window.EyeDropper = class {
      open() {
        return result
      }
    }
    return { finish: () => finish?.({ sRGBHex: '#FF0000' }) }
  })
  try {
    const popup = await openColor()
    await popup.getByRole('button', { name: 'Pick color from screen' }).click()
    await expect(popup.getByRole('button', { name: 'Pick color from screen' })).toBeDisabled()
    await editor.page.keyboard.press('Escape')
    await expect(popup).toHaveCount(0)
    await editor.canvas.drawRect(500, 300, 120, 80)
    await pending.evaluate((value) => value.finish())
    await expect(
      propertySection(editor.page, 'Fill').getByRole('textbox', { name: 'Fill', exact: true })
    ).toHaveValue('D9D9D9')
    await expect
      .poll(() =>
        readScenePixels(editor.page, [
          { x: 330, y: 330 },
          { x: 530, y: 330 }
        ])
      )
      .toEqual([
        [217, 217, 217, 255],
        [217, 217, 217, 255]
      ])
    editor.canvas.assertNoErrors()
  } finally {
    await pending.dispose()
  }
})

test('a browser without screen sampling exposes an unavailable action', async () => {
  await editor.page.evaluate(() => {
    delete window.EyeDropper
  })
  const popup = await openColor()
  await expect(
    popup.getByRole('button', { name: 'Screen color sampling is unavailable in this browser.' })
  ).toBeDisabled()
  await expect(
    propertySection(editor.page, 'Fill').getByRole('textbox', { name: 'Fill', exact: true })
  ).toHaveValue('D9D9D9')
  await editor.page.keyboard.press('Escape')
  editor.canvas.assertNoErrors()
})
