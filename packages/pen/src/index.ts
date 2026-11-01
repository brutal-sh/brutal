export {
  iconName,
  iconOptions,
  isDataURL,
  isDocumentAssetPath,
  penAssets,
  type PenAssets,
  type PenIconRequest
} from './assets'
export type { PenIconSource } from './nodes'
export {
  assertPenCompatible,
  inspectPenCompatibility,
  PenImportError,
  type PenImportDiagnostic
} from './compatibility'
export {
  buildPenGraph,
  parsePenDocument,
  parsePenFile,
  readPenFile,
  type PenReadOptions
} from './read'
export type { PenDocument, PenNode, PenOverride } from './schema'

export { writePenDocument, writePenFile, PenExportError, type PenExportDiagnostic } from './write'
export { isLegacyStroke } from './paints'
