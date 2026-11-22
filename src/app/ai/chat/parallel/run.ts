import { Chat } from '@ai-sdk/vue'
import type { UIMessage } from 'ai'
import { effectScope, markRaw, shallowReactive, watch } from 'vue'

import { computeContentBounds } from '@open-pencil/core/io/formats/raster'

import { assertAgentReady } from '@/app/ai/agents/setup/readiness'
import { resolveChatDocumentId } from '@/app/ai/chat/history/document'
import { createConversationStore } from '@/app/ai/chat/history/idb'
import { snapshotMessages } from '@/app/ai/chat/history/messages'
import { createHistorySession } from '@/app/ai/chat/history/session'
import type { Conversation } from '@/app/ai/chat/history/types'
import { createACPTransport } from '@/app/ai/chat/session'
import { designModelProfile } from '@/app/ai/models'
import type { EditorStore } from '@/app/editor/active-store'
import { allTabs, getTabForStore } from '@/app/tabs'

import {
  designVersionIsOpen,
  VERSION_GAP,
  VERSION_HEIGHT,
  VERSION_WIDTH,
  type DesignVersionTarget
} from './scope'

export type DesignVersionStatus = 'working' | 'finished' | 'stopped' | 'failed'

export interface DesignVersionRun {
  id: string
  title: string
  chat: Chat<UIMessage> | null
  status: DesignVersionStatus
  pending: boolean
  saved: boolean
  stop(): void
}

export interface ParallelDesignRun {
  versions: readonly DesignVersionRun[]
  stop(): void
  dispose(): void
}

const runs = shallowReactive(new Map<EditorStore, ParallelDesignRun>())

export function parallelDesignFor(store: EditorStore): ParallelDesignRun | undefined {
  return runs.get(store)
}

export function dismissParallelDesign(store: EditorStore): void {
  const run = runs.get(store)
  if (run?.versions.every((version) => !version.pending)) run.dispose()
}

function makeVersion(title: string): DesignVersionRun {
  const version = shallowReactive<DesignVersionRun>({
    id: crypto.randomUUID(),
    title,
    chat: null,
    status: 'working',
    pending: true,
    saved: false,
    stop() {
      if (version.status !== 'working') return
      version.status = 'stopped'
      void version.chat?.stop().catch(() => undefined)
    }
  })
  return version
}

function versionTargets(store: EditorStore, documentId: string, titles: readonly string[]) {
  const pageId = store.state.currentPageId
  const graph = store.graph
  const page = graph.getNode(pageId)
  if (page?.type !== 'CANVAS') return []
  const bounds = computeContentBounds(graph, page.childIds)
  const { panX, panY, zoom } = store.state
  const x = bounds ? bounds.maxX + VERSION_GAP : Math.round((56 - panX) / zoom)
  const y = bounds ? bounds.minY : Math.round((72 - panY) / zoom)
  return titles.map((title, index): DesignVersionTarget => ({
    store,
    graph,
    documentId,
    pageId,
    title,
    x: x + index * (VERSION_WIDTH + VERSION_GAP),
    y
  }))
}

async function executeVersion(
  version: DesignVersionRun,
  target: DesignVersionTarget,
  prompt: string,
  refreshHistory: () => Promise<void>
): Promise<void> {
  const working = () => version.status === 'working'
  if (!working()) return
  const conversations = createConversationStore()
  const now = new Date().toISOString()
  const transport = await createACPTransport(
    'acp:codex',
    target.store,
    undefined,
    {
      resume: null,
      record: (agentSession) => {
        conversation.agentSession = agentSession ?? undefined
        void save().catch(() => undefined)
      }
    },
    target
  )
  const conversation: Conversation = {
    id: version.id,
    documentId: await resolveChatDocumentId(target.store, conversations),
    documentName: target.store.state.documentName,
    title: `${version.title} · ${prompt.trim().slice(0, 84)}`,
    titleSource: 'manual',
    createdAt: now,
    updatedAt: now,
    profileId: designModelProfile.value?.id ?? null,
    backend: 'acp',
    interrupted: false,
    messages: []
  }
  const chat = markRaw(new Chat<UIMessage>({ transport }))
  const subscriptions = effectScope(true)
  const history = createHistorySession(() => transport.destroy())
  let pending: Promise<void> = Promise.resolve()

  function save(): Promise<void> {
    const snapshot: Conversation = {
      ...conversation,
      updatedAt: new Date().toISOString(),
      interrupted: history.interrupted || version.status === 'stopped',
      messages: snapshotMessages(chat.messages)
    }
    const write = pending.then(() => conversations.write(snapshot))
    pending = write.catch(() => undefined)
    return write
  }

  let succeeded = false
  try {
    if (!working() || !designVersionIsOpen(target)) return
    await save()
    if (!working() || !designVersionIsOpen(target)) return
    version.chat = chat
    subscriptions.run(() => history.attach(chat, save))
    await chat.sendMessage({ text: prompt })
    succeeded = chat.status === 'ready' && Boolean(target.rootId)
  } finally {
    try {
      await history.detach(save)
      version.saved = true
    } finally {
      subscriptions.stop()
      await transport.destroy().catch(() => undefined)
      await refreshHistory().catch(() => undefined)
    }
  }
  if (working()) version.status = succeeded ? 'finished' : 'failed'
}

export function startParallelDesign(
  store: EditorStore,
  prompt: string,
  titles: readonly [string, string],
  refreshHistory: () => Promise<void>
): boolean {
  const tab = getTabForStore(store)
  if (tab?.kind !== 'document' || store.state.readOnly || runs.has(store)) return false
  const targets = versionTargets(store, tab.id, titles)
  if (targets.length !== titles.length) return false
  const versions = titles.map(makeVersion)
  const run = {
    versions,
    stop: () => versions.forEach((version) => version.stop()),
    dispose() {
      run.stop()
      stopWatching()
      runs.delete(store)
    }
  }
  const stopWatching = watch(allTabs, (tabs) => {
    if (!tabs.some((entry) => entry.id === tab.id)) run.dispose()
  })
  runs.set(store, run)
  store.zoomToBounds(
    targets[0].x,
    targets[0].y,
    targets[1].x + VERSION_WIDTH,
    targets[1].y + VERSION_HEIGHT
  )
  void (async () => {
    try {
      await assertAgentReady('acp')
      await Promise.all(
        versions.map((version, index) =>
          executeVersion(version, targets[index], prompt, refreshHistory)
            .catch(() => {
              if (version.status === 'working') version.status = 'failed'
            })
            .finally(() => {
              version.pending = false
            })
        )
      )
    } catch {
      for (const version of versions) {
        if (version.status === 'working') version.status = 'failed'
        version.pending = false
      }
    }
  })()
  return true
}
