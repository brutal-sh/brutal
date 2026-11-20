import { createI18n, params } from '@nanostores/i18n'
import type { ComponentsJSON } from '@nanostores/i18n'
import { useStore } from '@nanostores/vue'

import { locale, type Locale, type TranslatedLocale } from '@open-pencil/vue/i18n'

export const notificationMessageDefaults = {
  chatInitializationFailed: params('Could not initialize chat: {error}'),
  linkCopied: 'Link copied to clipboard.',
  clipboardMissingDesignData: 'Clipboard does not contain design data.',
  clipboardAccessBlocked: 'Clipboard access is blocked in this browser context.',
  copiedAs: params('Copied as {format}.'),
  copiedProperties: 'Copied properties.',
  tokensLeftOut: params('Left out of the stylesheet: {names}.'),
  designTokensLeftOut: params('Left out of the design tokens: {names}.'),
  designTokensImported: params('Imported {count} design tokens.'),
  unsupportedVariableExpressions: params(
    'Brutal can’t evaluate these variables yet, so layers keep the values saved in the file: {names}.'
  ),
  nodeID: 'node ID',
  nodeIDs: 'node IDs',
  xPath: 'XPath',
  xPaths: 'XPaths',
  pngClipboardUnavailable: 'PNG clipboard export is not available in this browser.',
  openFileFailed: params('Could not open “{name}”: {error}'),
  viewDiagnostics: 'View diagnostics',
  pdfArtworkImported:
    'Opened each PDF page as an image. Save a separate .fig copy to keep your changes.',
  photoshopLayersImported:
    'Opened editable Photoshop image layers. Save a separate .fig copy to keep your changes.',
  photoshopArtworkImported: params('Opened the saved Photoshop composite as one image. {reason}'),
  svgImported:
    'Opened supported SVG vectors and text as editable layers. Review images and effects before saving a .fig copy.',
  sketchImported: 'Imported Sketch as an editable copy. Review it before saving.',
  sketchImportPartial: params(
    'Imported an editable Sketch copy. Some content was simplified or omitted ({features}).'
  ),
  importedDOMCSS: 'Imported DOM/CSS document.',
  importDOMCSSFailed: params('Could not import DOM/CSS: {error}'),
  openDOMCSSFailed: params('Could not open DOM/CSS file: {error}'),
  vectorizeCredentialRequired: params('Add a {provider} API key in Settings → Image services.'),
  vectorizeImageMissing: 'Image data is missing for this layer.',
  vectorizingImage: 'Vectorizing image…',
  imageConvertedToVectors: 'Image converted to vectors.',
  vectorizeCredentialFailed: params('{error}. Update it in Settings → Image services.'),
  vectorizeFailed: params('{provider} could not vectorize this image: {error}'),
  operationFailed: params('Operation failed: {error}'),
  nativeSaveTitle: params('Save {extension} file as…'),
  nativeSaveFailed: params('Could not save “{name}”'),
  recoveredSourceChanged:
    'Brutal could not verify that the original file is unchanged. Use File → Save As to keep a separate copy of the recovered work.',
  nativeSavePermissionDenied:
    'Brutal cannot save this file because you don’t have permission. Use File → Save As to save a copy in a folder you can write to.',
  storageConnected: 'Connected. Storage namespace is ready.',
  storageConnectionFailed: params('Could not connect to storage: {error}'),
  deepLinkLocateFile: params('Locate “{file}” to follow this link.'),
  deepLinkPickerDismissed: 'Link cancelled: no file was chosen.',
  deepLinkCancelled: params('Link cancelled: expected a file ending in “{file}”.'),
  deepLinkNodeNotFound: params('Node “{node}” was not found in “{file}”.'),
  openQueuedFilesFailed: params('Could not open the files handed to Brutal: {error}')
} as const

const localeLoaders = {
  de: () => import('./locales/de.json'),
  es: () => import('./locales/es.json'),
  fr: () => import('./locales/fr.json'),
  it: () => import('./locales/it.json'),
  ja: () => import('./locales/ja.json'),
  pl: () => import('./locales/pl.json'),
  ru: () => import('./locales/ru.json'),
  'zh-CN': () => import('./locales/zh-cn.json')
} satisfies Record<TranslatedLocale, () => Promise<{ default: Record<string, string> }>>

const appI18n = createI18n<Locale, 'en'>(locale, {
  baseLocale: 'en',
  async get(code): Promise<ComponentsJSON> {
    if (code === 'en') return {}
    const loaded = await localeLoaders[code]()
    return { notifications: loaded.default }
  }
})

export const notificationMessages = appI18n('notifications', notificationMessageDefaults)

export function useNotificationMessages() {
  return useStore(notificationMessages)
}
