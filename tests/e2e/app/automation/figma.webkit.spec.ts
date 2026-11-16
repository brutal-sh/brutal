import { expect, test } from '@playwright/test'

import { createScriptGroup, saveAndReopenScriptGroup } from '#tests/helpers/automation/figma'
import { CanvasHelper } from '#tests/helpers/canvas'
import { mockOfficialCloudDiscovery } from '#tests/helpers/cloud/discovery'

test.beforeEach(async ({ page }) => mockOfficialCloudDiscovery(page))

test('automation-created Figma groups retain history and remain editable after saving', async ({
  page
}) => {
  await page.goto('/?test')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  expect(await createScriptGroup(page)).toMatchObject({
    name: 'API group',
    children: [
      { name: 'First', width: 120, height: 80 },
      { name: 'Second', width: 120, height: 80 }
    ]
  })
  await page
    .getByRole('tablist', { name: 'Workspace panels' })
    .getByRole('tab', { name: 'Layers', exact: true })
    .click()
  const groups = page.getByRole('treeitem', { name: /^API group/ })
  await expect(groups).toHaveCount(1)
  await canvas.waitForRender()
  await test.info().attach('automation-group', {
    body: await canvas.screenshotCanvasRegion(640, 400),
    contentType: 'image/png'
  })
  await canvas.undo()
  await expect(groups).toHaveCount(0)
  await canvas.redo()
  await expect(groups).toHaveCount(1)
  await saveAndReopenScriptGroup(canvas)
  await expect(groups).toHaveCount(1)
  await groups.first().click()
  await canvas.duplicate()
  await expect(groups).toHaveCount(2)
  await canvas.undo()
  await expect(groups).toHaveCount(1)
  canvas.assertNoErrors()
})
