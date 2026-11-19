import { expect, expectInViewport, test, useEditorSetup } from '#tests/e2e/fixtures'
import { expectDefined } from '#tests/helpers/assert'
import { openAdvancedProperties, propertyItems, propertySection } from '#tests/helpers/properties'

const editor = useEditorSetup()
let styledRectangleId: string

function designPanel() {
  return editor.page.getByTestId('design-panel-single')
}

function fillSection() {
  return propertySection(editor.page, 'Fill')
}

function strokeSection() {
  return propertySection(editor.page, 'Stroke')
}

function positionSection() {
  return propertySection(editor.page, 'Position')
}

function effectsSection() {
  return propertySection(editor.page, 'Effects')
}

function getNode(id: string) {
  return editor.page.evaluate((nodeId) => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('OpenPencil store not initialized')
    const n = store.graph.getNode(nodeId)
    if (!n) return null
    return {
      fills: n.fills,
      strokes: n.strokes,
      effects: n.effects,
      opacity: n.opacity,
      visible: n.visible,
      blendMode: n.blendMode,
      isMask: n.isMask,
      maskType: n.maskType,
      x: n.x,
      y: n.y,
      width: n.width,
      height: n.height,
      rotation: n.rotation
    }
  }, id)
}

function getSelectedId() {
  return editor.page.evaluate(() => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('OpenPencil store not initialized')
    return [...store.state.selectedIds][0] ?? null
  })
}

function getSelectedIds() {
  return editor.page.evaluate(() => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('OpenPencil store not initialized')
    return [...store.state.selectedIds]
  })
}

function getBlendModes(ids: string[]) {
  return editor.page.evaluate((nodeIds) => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('OpenPencil store not initialized')
    return nodeIds.map((id) => store.graph.getNode(id)?.blendMode)
  }, ids)
}

function stageRectangles(xCoordinates: number[]) {
  return editor.page.evaluate((xs) => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('OpenPencil store not initialized')
    const ids = xs.map((x) => store.createShape('RECTANGLE', x, 100, 60, 60))
    store.select(ids)
    return ids
  }, xCoordinates)
}

test('selecting a rectangle shows design panel with type and name', async () => {
  await editor.canvas.drawRect(100, 100, 120, 80)
  await editor.canvas.waitForRender()

  await expect(designPanel()).toBeVisible()
  await expect(designPanel().getByRole('img', { name: 'RECTANGLE' })).toBeVisible()
  await expect(designPanel().getByRole('heading', { name: 'Rectangle' })).toBeVisible()
  await expect(designPanel()).toHaveScreenshot('design-panel-position-appearance.png')
})

test('position section shows X, Y, rotation inputs', async () => {
  const position = positionSection()
  await expect(position.getByRole('spinbutton', { name: 'X Axis', exact: true })).toBeVisible()
  await expect(position.getByRole('spinbutton', { name: 'Y Axis', exact: true })).toBeVisible()
  await expect(position.getByRole('spinbutton', { name: 'Rotation', exact: true })).toHaveAttribute(
    'aria-valuenow',
    '0'
  )
  const layout = propertySection(editor.page, 'Layout')
  for (const [name, value] of [
    ['Width', '120'],
    ['Height', '80']
  ]) {
    await expect(layout.getByRole('spinbutton', { name, exact: true })).toHaveAttribute(
      'aria-valuenow',
      value
    )
  }
})

test('fill section appears with default fill', async () => {
  await expect(fillSection()).toBeVisible()

  const fillItems = propertyItems(editor.page, 'fills')
  await expect(fillItems.first()).toBeVisible()
})

test('fill item shows color swatch and full hex value', async () => {
  const swatch = fillSection().getByTestId('fill-picker-swatch').first()
  await expect(swatch).toBeVisible()

  const fillItem = propertyItems(editor.page, 'fills').first()
  await expect(fillItem.getByRole('button', { name: 'Remove fill' })).toBeVisible()
  const hex = fillItem.locator('[data-property="color-hex"]')
  const metrics = await hex.evaluate((element) => ({
    fits: element.scrollWidth <= element.clientWidth,
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth
  }))
  expect(metrics.fits, JSON.stringify(metrics)).toBe(true)
})

test('clicking color area changes fill color', async () => {
  const id = await getSelectedId()
  const before = await getNode(expectDefined(id, 'selected id'))

  const swatch = fillSection().getByTestId('fill-picker-swatch').first()
  await swatch.click()

  const colorArea = editor.page.locator('.cursor-crosshair').first()
  await expect(colorArea).toBeVisible({ timeout: 5000 })

  const box = await colorArea.boundingBox()
  await editor.page.mouse.click(
    expectDefined(box, 'color area bounds').x + expectDefined(box, 'color area bounds').width - 10,
    expectDefined(box, 'color area bounds').y + 10
  )
  await editor.canvas.waitForRender()
  await editor.page.waitForTimeout(100)

  const after = await getNode(expectDefined(id, 'selected id'))
  const c1 = expectDefined(before, 'before node').fills[0].color
  const c2 = expectDefined(after, 'after node').fills[0].color
  expect(c1.r !== c2.r || c1.g !== c2.g || c1.b !== c2.b).toBe(true)

  // Close popover — click the swatch again to toggle it off
  await swatch.click()
  await editor.canvas.waitForRender()
})

test('adding a stroke creates stroke section item', async () => {
  const addBtn = strokeSection().getByRole('button', { name: 'Add stroke' })
  await addBtn.click()
  await editor.canvas.waitForRender()

  const strokeItems = propertyItems(editor.page, 'strokes')
  await expect(strokeItems.first()).toBeVisible()
  await expect(strokeItems.first().getByRole('button', { name: 'Remove stroke' })).toBeVisible()
  const hex = strokeItems.first().locator('[data-property="color-hex"]')
  expect(await hex.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true)

  const id = await getSelectedId()
  const node = await getNode(expectDefined(id, 'selected id'))
  expect(expectDefined(node, 'node node').strokes.length).toBe(1)
})

test('adding an effect creates effect item', async () => {
  await effectsSection().getByRole('combobox', { name: 'Add effect', exact: true }).click()
  await editor.page.getByRole('option', { name: 'Drop Shadow', exact: true }).click()
  await editor.canvas.waitForRender()

  const effectItems = propertyItems(editor.page, 'effects')
  await expect(effectItems.first()).toBeVisible()

  styledRectangleId = expectDefined(await getSelectedId(), 'selected id')
  const node = await getNode(styledRectangleId)
  expect(expectDefined(node, 'node node').effects.map((effect) => effect.type)).toEqual([
    'DROP_SHADOW'
  ])
})

test('effect settings expand semantically and row remove stays visible', async () => {
  const effectItem = propertyItems(editor.page, 'effects').first()
  const expand = effectItem.getByRole('button', { name: 'Drop Shadow', exact: true })
  const settings = editor.page.getByRole('dialog', { name: 'Drop Shadow', exact: true })
  await expect(expand).toHaveAttribute('aria-expanded', 'true')
  await expect(settings.getByRole('spinbutton', { name: 'Blur', exact: true })).toBeVisible()
  await editor.page.keyboard.press('Escape')
  await expect(expand).toHaveAttribute('aria-expanded', 'false')
  await expand.click()
  await expect(expand).toHaveAttribute('aria-expanded', 'true')
  await expect(settings).toBeVisible()
  await editor.page.keyboard.press('Escape')
  await expect(settings).toHaveCount(0)

  const remove = effectItem.getByRole('button', { name: 'Remove effect' })
  await expect(remove).toHaveCSS('opacity', '1')
  await editor.page.getByRole('tab', { name: 'Layers', exact: true }).focus()
  await editor.page.mouse.move(0, 0)
  await expect(remove).toHaveCSS('opacity', '1')
})

test('paint effect and export rows share compact visual anatomy', async () => {
  const exportSection = propertySection(editor.page, 'Export')
  await expect(exportSection.getByRole('combobox', { name: 'Export scale' })).toHaveText('1x')
  await expect(exportSection.getByRole('combobox', { name: 'Export format' })).toHaveText('PNG')
  const exportLayer = exportSection.getByRole('button', { name: 'Export layer' })
  await exportLayer.scrollIntoViewIfNeeded()
  await expect(exportLayer).toBeInViewport({ ratio: 1 })
  await editor.canvas.waitForRender()
  await editor.page.mouse.move(0, 0)

  await expect(designPanel()).toHaveScreenshot('design-panel-paint-effects-export.png')
})

test('adding a second fill shows two fill items', async () => {
  const addBtn = fillSection().getByRole('button', { name: 'Add fill' })
  await addBtn.click()
  await editor.canvas.waitForRender()

  const fillItems = propertyItems(editor.page, 'fills')
  expect(await fillItems.count()).toBe(2)

  const id = await getSelectedId()
  const node = await getNode(expectDefined(id, 'selected id'))
  expect(expectDefined(node, 'node node').fills.length).toBe(2)
})

test('Advanced properties exposes the layer blend control', async () => {
  const appearance = propertySection(editor.page, 'Appearance')
  await expect(appearance.getByRole('combobox', { name: 'Blend mode' })).toHaveCount(0)
  await openAdvancedProperties(editor.page)
  await expect(appearance.getByRole('combobox', { name: 'Blend mode' })).toBeVisible()
})

test('blend mode select updates the selected layer', async () => {
  const id = await getSelectedId()
  const blendModeSelect = propertySection(editor.page, 'Appearance').getByRole('combobox', {
    name: 'Blend mode'
  })
  await expect(blendModeSelect).toBeVisible()

  await blendModeSelect.click()
  await editor.page.getByRole('option', { name: 'Multiply' }).click()
  await editor.canvas.waitForRender()

  const node = await getNode(expectDefined(id, 'selected id'))
  expect(expectDefined(node, 'node').blendMode).toBe('MULTIPLY')
})

test('multi-select blend mode change is one undo step', async () => {
  await stageRectangles([300, 400])
  await editor.canvas.selectAll()
  await editor.canvas.waitForRender()

  const ids = await getSelectedIds()
  expect(ids).toHaveLength(3)
  const previousBlendModes = await getBlendModes(ids)
  expect(previousBlendModes).toContain('PASS_THROUGH')
  expect(previousBlendModes).toContain('MULTIPLY')

  const blendModeSelect = propertySection(editor.page, 'Appearance').getByRole('combobox', {
    name: 'Blend mode'
  })
  await blendModeSelect.click()
  await editor.page.getByRole('option', { name: 'Multiply' }).click()
  await editor.canvas.waitForRender()

  const expected = ids.map(() => 'MULTIPLY')
  expect(await getBlendModes(ids)).toEqual(expected)

  await editor.canvas.undo()
  expect(await getBlendModes(ids)).toEqual(previousBlendModes)

  await editor.canvas.redo()
  expect(await getBlendModes(ids)).toEqual(expected)
})

test('mask action opens the Mask section and changes its type', async () => {
  const [id] = await stageRectangles([500])
  await editor.canvas.waitForRender()
  const maskAction = editor.page.getByTestId('selection-toggle-mask')
  await expect(maskAction).toBeVisible()

  await expect(propertySection(editor.page, 'Mask')).toHaveCount(0)
  await maskAction.click()
  const maskSection = propertySection(editor.page, 'Mask')
  await expect(maskSection).toBeVisible()
  expect(expectDefined(await getNode(id), 'node').isMask).toBe(true)

  const maskTypeSelect = maskSection.getByRole('combobox', { name: 'Mask type' })
  await maskTypeSelect.click()
  await editor.page.getByRole('option', { name: 'Luminance' }).click()
  await expect(maskTypeSelect).toHaveText('Luminance')
  expect(expectDefined(await getNode(id), 'node').maskType).toBe('LUMINANCE')
})

test('removing the mask clears its section and layer flag', async () => {
  const id = expectDefined(await getSelectedId(), 'selected id')
  await editor.page.getByTestId('selection-toggle-mask').click()
  await expect(propertySection(editor.page, 'Mask')).toHaveCount(0)
  expect(expectDefined(await getNode(id), 'node').isMask).toBe(false)
})

test('visibility toggle in appearance section works', async () => {
  const visBtn = propertySection(editor.page, 'Appearance').getByRole('button', {
    name: 'Toggle visibility'
  })
  await expect(visBtn).toBeVisible()

  const id = await getSelectedId()
  const before = await getNode(expectDefined(id, 'selected id'))
  expect(expectDefined(before, 'before node').visible).toBe(true)

  await visBtn.click()
  await editor.canvas.waitForRender()

  const after = await getNode(expectDefined(id, 'selected id'))
  expect(expectDefined(after, 'after node').visible).toBe(false)

  await visBtn.click()
  await editor.canvas.waitForRender()

  const restored = await getNode(expectDefined(id, 'selected id'))
  expect(expectDefined(restored, 'restored node').visible).toBe(true)
})

const visibilityCases = [
  { property: 'fills', section: 'Fill' },
  { property: 'strokes', section: 'Stroke' },
  { property: 'effects', section: 'Effects' }
] as const

visibilityCases.forEach((entry) => {
  const isVisible = async () =>
    expectDefined(await getNode(styledRectangleId), 'selected node')[entry.property][0]?.visible

  const toggle = () =>
    propertyItems(editor.page, entry.property)
      .first()
      .getByRole('button', { name: 'Toggle visibility' })

  test(`hiding ${entry.section} updates the control and layer`, async () => {
    // The earlier compact controls already create all three rows on this rectangle.
    await editor.page.evaluate((id) => {
      const store = window.openPencil?.getStore?.()
      if (!store) throw new Error('OpenPencil store not initialized')
      store.select([id])
    }, styledRectangleId)

    expect(await isVisible()).toBe(true)
    await toggle().click()
    await expect(toggle()).toHaveAttribute('aria-pressed', 'false')
    expect(await isVisible()).toBe(false)
  })

  test(`a second click shows ${entry.section} again`, async () => {
    await toggle().click()
    await expect(toggle()).toHaveAttribute('aria-pressed', 'true')
    expect(await isVisible()).toBe(true)
  })

  test(`${entry.section} visibility restores through Undo and Redo`, async () => {
    await editor.canvas.undo()
    expect(await isVisible()).toBe(false)
    await editor.canvas.redo()
    expect(await isVisible()).toBe(true)
  })
})

test('deselecting shows empty design panel', async () => {
  await editor.page.keyboard.press('Escape')
  await editor.canvas.waitForRender()

  await expect(editor.page.getByTestId('design-panel-empty')).toBeVisible()
})

test('multi-select shows a mixed header and the boolean tooltip', async () => {
  await stageRectangles([300, 400])
  await editor.canvas.selectAll()
  await editor.canvas.waitForRender()

  const multiHeader = editor.page
    .getByTestId('design-panel-multi')
    .getByRole('heading', { name: /selected/ })
  await expect(multiHeader).toBeVisible()

  const booleanOperations = editor.page.getByTestId('boolean-operations-trigger')
  await booleanOperations.hover()
  await expect(
    editor.page.locator('[role=tooltip]').filter({ hasText: 'Boolean operations' })
  ).toBeVisible()
})

test('opening boolean operations dismisses the tooltip and puts Union in view', async () => {
  await editor.page.getByTestId('boolean-operations-trigger').click()
  await expect(
    editor.page.locator('[role=tooltip]').filter({ hasText: 'Boolean operations' })
  ).toHaveCount(0)
  const booleanUnion = editor.page.getByTestId('boolean-operation-booleanUnion')
  await expect(booleanUnion).toBeVisible()
  await expectInViewport(editor.page, booleanUnion)
})

test('the boolean menu offers the remaining operations', async () => {
  await expect(editor.page.getByTestId('boolean-operation-booleanSubtract')).toBeVisible()
  await expect(editor.page.getByTestId('boolean-operation-booleanIntersect')).toBeVisible()
  await expect(editor.page.getByTestId('boolean-operation-booleanExclude')).toBeVisible()
  await expect(editor.page.getByTestId('boolean-operation-flatten')).toBeVisible()
})
