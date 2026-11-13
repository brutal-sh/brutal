import { appTargetOptions } from '#cli/app/target'
import { printError } from '#cli/format'

import { FONT_POLICIES } from './font-policy'
import { FORMAT_IDS, FORMAT_LIST } from './formats'

const ALL_FORMATS = new Set(FORMAT_IDS.map((id) => id.toUpperCase()))
const JSX_STYLES = new Set(['openpencil', 'tailwind'])
const HTML_STYLES = new Set(['inline', 'tailwind'])
const HTML_MODES = new Set(['fragment', 'standalone'])
const HTML_ASSETS = new Set(['inline', 'external'])
const HTML_FONTS = new Set(['assets', 'none'])

export interface ExportArgs {
  file?: string
  output?: string
  format: string
  scale: string
  quality?: string
  page?: string
  node?: string
  style: string
  html: string
  css: string
  assets: string
  fonts?: string
  framework: string
  'design-images': boolean
  watch?: boolean
  'font-policy': string
  thumbnail?: boolean
  width: string
  height: string
  'document-id'?: string
  'page-id'?: string
}

export const exportArgs = {
  file: {
    type: 'positional',
    description:
      'Document file path (omit to connect to running app); for storybook, several files or a quoted glob',
    required: false
  },
  output: {
    type: 'string',
    alias: 'o',
    description:
      'Output file path (default: <name>.<format>); for storybook, a directory (default: <name>-stories)',
    required: false
  },
  format: {
    type: 'string',
    alias: 'f',
    description: `Export format: ${FORMAT_IDS.join(', ')} (default: png)`,
    default: 'png'
  },
  scale: { type: 'string', alias: 's', description: 'Export scale (default: 1)', default: '1' },
  quality: {
    type: 'string',
    alias: 'q',
    description: 'Quality 0-100 for JPG/WEBP (default: 90)',
    required: false
  },
  page: {
    type: 'string',
    description:
      'Export a specific page by name (FIG, PPTX, and Storybook default to the whole document)',
    required: false
  },
  node: {
    type: 'string',
    description: 'Export a specific node by ID (cannot be combined with --page)',
    required: false
  },
  style: {
    type: 'string',
    description: 'JSX style: openpencil or tailwind (default: openpencil)',
    default: 'openpencil'
  },
  html: {
    type: 'string',
    description: 'HTML output mode: fragment or standalone (default: fragment)',
    default: 'fragment'
  },
  css: {
    type: 'string',
    description:
      'CSS output: inline or tailwind; for Storybook, how Vue and React components are styled (default: inline)',
    default: 'inline'
  },
  assets: {
    type: 'string',
    description: 'HTML asset output: inline or external (default: inline)',
    default: 'inline'
  },
  fonts: {
    type: 'string',
    description:
      'HTML and Storybook font files: assets or none (default: none for HTML, assets for Storybook)'
  },
  framework: {
    type: 'string',
    description: 'Storybook framework: react, vue, or html (default: react)',
    default: 'react'
  },
  'design-images': {
    type: 'boolean',
    description: 'Storybook: render each variant to PNG for the Design panel (default: true)',
    default: true
  },
  watch: {
    type: 'boolean',
    description: 'Storybook: re-export whenever the document changes'
  },
  beside: {
    type: 'boolean',
    description: "Storybook: write each document's stories into the document's own folder"
  },
  rules: {
    type: 'string',
    description:
      'Storybook: rules file for which stories each component gets and its title (default: openpencil.stories.json when present)'
  },
  'font-policy': {
    type: 'string',
    description: 'Raster/PDF font policy: warn, strict, or allow (default: warn)',
    default: 'warn'
  },
  thumbnail: { type: 'boolean', description: 'Export page thumbnail instead of full render' },
  width: { type: 'string', description: 'Thumbnail width (default: 1920)', default: '1920' },
  height: { type: 'string', description: 'Thumbnail height (default: 1080)', default: '1080' },
  ...appTargetOptions
} as const

function validateFormatOptions(format: string, args: ExportArgs): void {
  if (format === 'JSX' && !JSX_STYLES.has(args.style)) {
    printError(`Invalid JSX style "${args.style}". Use openpencil or tailwind.`)
    process.exit(1)
  }

  if (format === 'HTML' && !HTML_MODES.has(args.html)) {
    printError(`Invalid HTML mode "${args.html}". Use fragment or standalone.`)
    process.exit(1)
  }

  if (format === 'HTML' && !HTML_STYLES.has(args.css)) {
    printError(`Invalid HTML CSS output "${args.css}". Use inline or tailwind.`)
    process.exit(1)
  }

  if (format === 'HTML' && !HTML_ASSETS.has(args.assets)) {
    printError(`Invalid HTML asset output "${args.assets}". Use inline or external.`)
    process.exit(1)
  }
}

export function validateExportArgs(args: ExportArgs): string {
  const format = args.format.toUpperCase()
  if (!ALL_FORMATS.has(format)) {
    printError(`Invalid format "${args.format}". Use ${FORMAT_LIST}.`)
    process.exit(1)
  }
  validateFormatOptions(format, args)
  if (args.fonts && !HTML_FONTS.has(args.fonts)) {
    printError(`Invalid font output "${args.fonts}". Use assets or none.`)
    process.exit(1)
  }

  if (!FONT_POLICIES.has(args['font-policy'])) {
    printError(`Invalid font policy "${args['font-policy']}". Use warn, strict, or allow.`)
    process.exit(1)
  }
  return format
}
