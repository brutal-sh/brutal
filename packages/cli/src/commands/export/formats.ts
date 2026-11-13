import { BUILTIN_IO_FORMATS, IORegistry } from '@open-pencil/core/io'

export const io = new IORegistry(BUILTIN_IO_FORMATS)
// Storybook writes a folder of stories, so it stays a CLI command beside the IO formats.
export const FORMAT_IDS = [...io.listExportFormats('node').map((format) => format.id), 'storybook']
export const FORMAT_LIST = `${FORMAT_IDS.slice(0, -1).join(', ')}, or ${FORMAT_IDS.at(-1)}`

export function formatSupportsScale(format: string): boolean {
  return io.getFormat(format.toLowerCase())?.exportOptions?.scale ?? false
}
