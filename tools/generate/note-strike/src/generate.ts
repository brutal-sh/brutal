/** Regenerate Core's Note glyph data from the bundled OFL font. Requires FreeType headers and a C compiler. */
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { deflateRawSync } from 'node:zlib'

import { fromUint8Array } from 'js-base64'

import { resolveWorkspaceRoot } from '@open-pencil/package-artifacts-tools'

function run(args: string[]) {
  const result = Bun.spawnSync(args)
  if (!result.success) throw new Error(`${args[0]}: ${result.stderr.toString()}`)
  return result.stdout
}

const root = await resolveWorkspaceRoot(import.meta.dir)
const work = await mkdtemp(join(tmpdir(), 'open-pen-note-strike-'))
try {
  const prefix = process.argv[2]
  const flags = prefix
    ? [`-I${join(prefix, 'include/freetype2')}`, `-L${join(prefix, 'lib')}`, '-lfreetype']
    : run(['pkg-config', '--cflags', '--libs', 'freetype2']).toString().trim().split(/\s+/)
  const binary = join(work, 'strike')
  const font = join(root, 'packages/core/assets/InstrumentSansVariable.ttf')
  run([process.env.CC ?? 'cc', join(import.meta.dir, 'strike.c'), '-o', binary, ...flags])
  const data = run([binary, font])
  const output = join(root, 'packages/core/src/canvas/text/note-strike-data.json')
  const file = await Bun.file(font).bytes()
  const tableCount = new DataView(file.buffer, file.byteOffset, file.byteLength).getUint16(4)
  const json = JSON.stringify(
    {
      fontBytes: file.length,
      tableDirectory: fromUint8Array(file.subarray(0, 12 + 16 * tableCount)),
      words: fromUint8Array(deflateRawSync(data, { level: 9 }))
    },
    null,
    2
  )
  await Bun.write(output, json + '\n')
} finally {
  await rm(work, { recursive: true, force: true })
}
