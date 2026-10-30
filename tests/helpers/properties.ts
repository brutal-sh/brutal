import type { Locator, Page } from '@playwright/test'

import { openAppMenu } from '#tests/helpers/menu'

export async function openAdvancedProperties(page: Page) {
  await (
    await openAppMenu(page, 'View')
  )
    .getByRole('menuitem', { name: 'Advanced properties', exact: true })
    .click()
}

export function propertySection(page: Page, name: string): Locator {
  return page.getByRole('region', { name, exact: true })
}

/** The Design panel's header for the selected layer, found by the layer's name. */
export function layerHeader(page: Page, name: string): Locator {
  return page.locator('header').filter({ has: page.getByRole('heading', { name, exact: true }) })
}

export function propertyField(page: Page, property: string): Locator {
  return page.locator(`[data-property=${JSON.stringify(property)}]`)
}

export function propertyItems(page: Page, property: string): Locator {
  return page.locator(`[data-property=${JSON.stringify(property)}][data-index]`)
}

export function propertyItem(page: Page, property: string, index = 0): Locator {
  return page.locator(
    `[data-property=${JSON.stringify(property)}][data-index=${JSON.stringify(String(index))}]`
  )
}
