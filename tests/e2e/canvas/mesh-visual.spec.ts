import { expect, test, useEditorSetupWithClear } from '#tests/e2e/fixtures'
import { meshDriver } from '#tests/helpers/canvas/mesh/driver'

const editor = useEditorSetupWithClear('/?test&no-chrome&no-rulers')
const mesh = meshDriver(() => editor.page)

test('mesh fill and selected point handles', async () => {
  const id = await mesh.show()
  await mesh.edit(id)
  await editor.canvas.waitForRender()
  expect(await editor.canvas.screenshotCanvasRegion(600, 480)).toMatchSnapshot(
    'mesh-fill-handles.png',
    { maxDiffPixelRatio: 0, threshold: 0 }
  )
  editor.canvas.assertNoErrors()
})
