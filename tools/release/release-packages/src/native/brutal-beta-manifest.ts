import { readFile, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { releaseVersionSchema, isPrerelease } from '#release/version'
import { decode, isValid } from 'js-base64'
import * as v from 'valibot'

import { resolveWorkspaceRoot } from '@open-pencil/package-artifacts-tools'

import { assertSignedVersion } from './signature'

const directory = process.argv[2]
if (!directory)
  throw new Error('Pass the directory containing the signed Mac beta and release notes')

const root = await resolveWorkspaceRoot(process.cwd())
const config = v.parse(
  v.pipe(v.string(), v.parseJson(), v.object({ version: releaseVersionSchema })),
  await readFile(join(root, 'desktop/tauri.macos-beta.json'), 'utf8')
)
const { version } = config
if (!isPrerelease(version)) throw new Error('Expected a numbered Brutal beta version')

const archive = `Brutal-${version}-macOS-arm64.app.tar.gz`
const [artifact, signatureText, notes] = await Promise.all([
  stat(join(directory, archive)),
  readFile(join(directory, `${archive}.sig`), 'utf8'),
  readFile(join(directory, 'release-notes.md'), 'utf8')
])
const signature = signatureText.trim()
if (!artifact.isFile() || artifact.size === 0) throw new Error(`Missing updater archive ${archive}`)
if (!signature || !isValid(signature)) throw new Error(`Invalid signature for ${archive}`)
if (!notes.trim()) throw new Error('Release notes are empty')
assertSignedVersion(decode(signature), version, archive)

await writeFile(
  join(directory, 'latest.json'),
  JSON.stringify(
    {
      version,
      notes,
      pub_date: new Date().toISOString(),
      platforms: {
        'darwin-aarch64': {
          signature,
          url: `https://github.com/brutal-sh/open-pen-feedback/releases/download/v${version}/${archive}`
        }
      }
    },
    null,
    2
  ) + '\n'
)
