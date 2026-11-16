import type { Page } from '@playwright/test'
import * as v from 'valibot'

import type * as Catalog from '@/app/ai/tools/catalog'
import type * as Runner from '@/app/ai/tools/runner'
import type * as FigmaFactory from '@/app/automation/bridge/figma-factory'
import type * as Deferred from '@/app/runtime/deferred'
import type * as AppTabs from '@/app/tabs'

const selectionFrameSchema = v.pipe(
  v.string(),
  v.parseJson(),
  v.variant('type', [
    v.object({
      type: v.literal('request'),
      id: v.string(),
      command: v.literal('tool'),
      args: v.object({ name: v.literal('select_nodes'), document_id: v.string() })
    }),
    v.object({ type: v.literal('cancel'), id: v.string() })
  ])
)

/** Register before navigation; retain only selection/cancel IDs, never credentials. */
export function observeSelectionRequests(page: Page) {
  const requests: { id: string; document: string }[] = []
  const cancelled = new Set<string>()
  page.on('websocket', (socket) => {
    if (new URL(socket.url()).port !== (process.env.OPENPENCIL_TEST_MCP_PORT ?? '7600')) return
    socket.on('framereceived', ({ payload }) => {
      const result = v.safeParse(selectionFrameSchema, payload)
      if (!result.success) return
      if (result.output.type === 'cancel') cancelled.add(result.output.id)
      else requests.push({ id: result.output.id, document: result.output.args.document_id })
    })
  })
  return { requests, cancelled }
}

/** Own one real editor mutex until released; no graph, history or view mutation. */
export async function holdOwnedEditorLock(page: Page, document: string) {
  return page.evaluateHandle(async (document) => {
    const tabsURL = '/src/app/tabs/index.ts'
    const catalogURL = '/src/app/ai/tools/catalog.ts'
    const runnerURL = '/src/app/ai/tools/runner.ts'
    const figmaURL = '/src/app/automation/bridge/figma-factory.ts'
    const deferredURL = '/src/app/runtime/deferred.ts'
    const tabs: typeof AppTabs = await import(tabsURL)
    const catalog: typeof Catalog = await import(catalogURL)
    const runner: typeof Runner = await import(runnerURL)
    const factory: typeof FigmaFactory = await import(figmaURL)
    const deferred: typeof Deferred = await import(deferredURL)
    const store = tabs.getTabById(document)?.store
    const def = catalog.aiToolDefinitions.find((tool) => tool.name === 'create_shape')
    if (!store || !def) throw new Error('Missing owned editor lock fixture')
    const entered = deferred.createDeferred<undefined>()
    const held = deferred.createDeferred<undefined>()
    const call = { store, figma: factory.makeFigmaFromStore(store), def, args: {} }
    const pending = runner.runEditorTool({
      ...call,
      def: {
        ...def,
        execute: () => {
          entered.resolve(undefined)
          return held.promise
        }
      }
    })
    await entered.promise
    return {
      async release() {
        held.resolve(undefined)
        await pending
      },
      async releaseAndDrain() {
        const drained = runner.runEditorTool({
          ...call,
          def: { ...def, execute: () => undefined }
        })
        held.resolve(undefined)
        await pending
        await drained
      }
    }
  }, document)
}
