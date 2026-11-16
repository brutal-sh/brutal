import * as v from 'valibot'

import { parseToolArgs } from '@open-pencil/core/tools'

import type { AutomationFiles } from '@/app/automation/bridge/file-handlers'
import {
  resolveAutomationTarget,
  responseWithTarget,
  type AutomationTarget
} from '@/app/automation/bridge/target'
import { getTabById, getTabsSnapshot } from '@/app/tabs'
import { IS_TAURI } from '@/constants'

const savePathsSchema = v.strictObject({
  paths: v.pipe(v.array(v.pipe(v.string(), v.minLength(1))), v.minLength(1), v.maxLength(2))
})

type SaveHandler = (
  target: AutomationTarget,
  args: unknown,
  signal?: AbortSignal,
  beforeWrite?: () => void
) => Promise<unknown>

interface URISaveOptions {
  files?: AutomationFiles
  signal?: AbortSignal
  save: SaveHandler
}

function resolveSource(paths: string[], files: AutomationFiles | undefined) {
  const candidates = paths.map((path) => ({
    path,
    identity: files && !IS_TAURI ? files.url(path).href : path
  }))
  const matches = getTabsSnapshot().flatMap((tab) => {
    const source = tab.store.getSourceIdentity()
    const candidate = candidates.find((item) => item.identity === source.path)
    return candidate ? [{ tab, source, path: candidate.path }] : []
  })
  const match = matches.at(0)
  if (matches.length !== 1 || !match) {
    throw new Error('Save URI must identify exactly one already-open document')
  }
  return {
    ...match,
    target: resolveAutomationTarget(match.tab.store, { document_id: match.tab.id })
  }
}

function assertSaveTarget(match: ReturnType<typeof resolveSource>) {
  const { tab, target, source } = match
  if (
    getTabById(tab.id)?.store !== target.store ||
    target.store.getSourceIdentity() !== source ||
    target.store.state.readOnly
  ) {
    throw new Error('Document source or access changed before Save (closed or read-only)')
  }
}

export async function handleURISave(args: unknown, options: URISaveOptions): Promise<unknown> {
  const { paths } = parseToolArgs('save', savePathsSchema, args)
  const { signal, files, save } = options
  signal?.throwIfAborted()
  const match = resolveSource(paths, files)
  const { path, target } = match
  assertSaveTarget(match)
  if (!(await target.store.preparePageNodes(target.pageId))) {
    throw new Error('The document page closed before Save was ready')
  }
  signal?.throwIfAborted()
  assertSaveTarget(match)
  const result = await save(target, files && !IS_TAURI ? { path } : {}, signal, () => {
    signal?.throwIfAborted()
    assertSaveTarget(match)
  })
  return responseWithTarget(result, target)
}
