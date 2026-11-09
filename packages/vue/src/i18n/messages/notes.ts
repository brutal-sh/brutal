import { i18n } from '#vue/i18n/create'

export const noteMessageDefaults = {
  title: 'Note',
  createComponent: 'Create Component',
  detachComponent: 'Detach Component',
  addFlexLayout: 'Add flex layout',
  dimensions: 'Dimensions',
  color: 'Color',
  colorHex: 'Note color',
  yellow: 'Yellow',
  orange: 'Orange',
  coral: 'Coral',
  pink: 'Pink',
  purple: 'Purple',
  blue: 'Blue',
  green: 'Green',
  gray: 'Gray'
} as const

export const noteMessages = i18n('notes', noteMessageDefaults)
