import { filename } from 'pathe/utils'

import { BUILTIN_IO_FORMATS, IORegistry } from '@open-pencil/core/io'

import { documentAssetReader } from '@/app/document/io/assets'
import { yieldToUI } from '@/app/document/io/browser'
import { nativeArtworkFormat, openNativeArtwork } from '@/app/document/io/native-artwork'
import type { DocumentSourceIdentity } from '@/app/document/io/types'
import { appIcons } from '@/app/editor/icons/provider'
import type { EditorPreparationHandle as DocumentLoadSession } from '@/app/editor/preparation/types'
import type { EditorStore } from '@/app/editor/session'
import { notificationMessages } from '@/app/i18n/notifications'
import { createDeferred } from '@/app/runtime/deferred'
import { toast } from '@/app/shell/ui'
import { getTabForStore, switchTab, tabsRef } from '@/app/tabs/lifecycle'
import { createFileOpenCoordinator } from '@/app/tabs/open/coordinator'
import { cacheOpenedFigCover, watchOpenedFigCover } from '@/app/tabs/open/cover'
import { findTabByFileIdentity } from '@/app/tabs/open/identity'
import { readFigForTab, showImportedGraph } from '@/app/tabs/open/imported'
import { failPreparation, reusableTabStore, releaseOpeningTab } from '@/app/tabs/open/session'

const io = new IORegistry(BUILTIN_IO_FORMATS)
const fileOpenCoordinator = createFileOpenCoordinator()

type FileOpeningInput = { file: File; handle?: FileSystemFileHandle; path?: string }

function isDOMImportFile(file: File): boolean {
  return /\.(html?|xhtml)$/i.test(file.name)
}

function cacheFigCover(path: string, store: EditorStore) {
  void cacheOpenedFigCover(path, store).catch((error) => {
    console.warn('[Recent files] Failed to cache the thumbnail', error)
  })
}

function createFileOpening(file: File, identity: DocumentSourceIdentity) {
  const opening = reusableTabStore()
  const { store } = opening
  store.state.documentName = filename(file.name) ?? file.name
  const load = store.preparationController.begin({
    kind: isDOMImportFile(file) ? 'dom-import' : 'document-open',
    subject: file.name
  })
  const completion = createDeferred<undefined>()
  void completion.promise.catch(() => undefined)
  const pendingOpen = { completion: completion.promise, identity, store }
  fileOpenCoordinator.add(pendingOpen)
  return { kind: 'owner' as const, completion, pendingOpen, store, opening, load }
}

type FileOpening = ReturnType<typeof createFileOpening>

async function decideFileOpening(input: FileOpeningInput, identity: DocumentSourceIdentity) {
  const pending = await fileOpenCoordinator.findPending(identity)
  if (pending) {
    const tab = getTabForStore(pending.store)
    if (tab) switchTab(tab.id)
    return { kind: 'pending' as const, completion: pending.completion, store: pending.store }
  }
  const existing = await findTabByFileIdentity(tabsRef.value, identity)
  if (existing) {
    switchTab(existing.id)
    if (input.path?.toLowerCase().endsWith('.fig')) {
      watchOpenedFigCover(input.path, existing.store)
      cacheFigCover(input.path, existing.store)
    }
    return { kind: 'existing' as const, store: existing.store }
  }
  return createFileOpening(input.file, identity)
}

async function readFileGraph(file: File, path: string | undefined, load: DocumentLoadSession) {
  await yieldToUI()
  load.update({ phase: 'reading', detail: file.name })
  const lowerName = file.name.toLowerCase()
  const isFig = lowerName.endsWith('.fig')
  if (isFig || lowerName.endsWith('.jam')) {
    load.update({ phase: 'decoding', detail: file.name })
    return {
      imported: await readFigForTab(file, load.signal),
      sourceFormat: isFig ? 'fig' : 'jam',
      importWarnings: undefined,
      isFig
    }
  }
  const artwork = nativeArtworkFormat(file.name)
  if (artwork) {
    load.update({ phase: 'decoding', detail: file.name })
    return {
      imported: await openNativeArtwork(file, artwork, load.signal),
      sourceFormat: artwork,
      importWarnings: undefined,
      isFig
    }
  }
  const maxBytes = io.findReader(file.name, file.type)?.maxReadBytes
  if (maxBytes !== undefined && file.size > maxBytes)
    throw new Error('File exceeds its size limit.')
  const result = await io.readDocument(
    {
      name: file.name,
      mimeType: file.type || undefined,
      data: new Uint8Array(await file.arrayBuffer()),
      readAsset: documentAssetReader(path)
    },
    { icons: appIcons }
  )
  return {
    imported: result.graph,
    sourceFormat: result.sourceFormat,
    importWarnings: result.importWarnings,
    isFig
  }
}

async function loadFileOpening({ file, handle, path }: FileOpeningInput, owner: FileOpening) {
  const { completion, pendingOpen, store, opening, load } = owner
  let succeeded = false
  try {
    if (isDOMImportFile(file)) {
      await store.openDOMFile(file, { handle, path, preparation: load })
      completion.resolve(undefined)
      succeeded = true
      return store
    }
    const { imported, sourceFormat, importWarnings, isFig } = await readFileGraph(file, path, load)
    await showImportedGraph(
      store,
      imported,
      () => {
        store.setDocumentSource(file.name, sourceFormat, handle, path)
        if (isFig && path) watchOpenedFigCover(path, store)
      },
      load
    )
    if (isFig && path) cacheFigCover(path, store)
    if (sourceFormat === 'pdf' || sourceFormat === 'ai') {
      toast.info(notificationMessages.get().pdfArtworkImported)
    }
    if (sourceFormat === 'psd' || sourceFormat === 'psb') {
      toast.info(notificationMessages.get().photoshopArtworkImported)
    }
    if (sourceFormat === 'svg') toast.info(notificationMessages.get().svgImported)
    if (sourceFormat === 'sketch') {
      const messages = notificationMessages.get()
      if (importWarnings?.length)
        toast.warning(messages.sketchImportPartial({ features: importWarnings.join(', ') }))
      else toast.info(messages.sketchImported)
    }
    completion.resolve(undefined)
    succeeded = true
    return store
  } catch (error) {
    failPreparation(load, 'decode-failed', error)
    completion.reject(error)
    await releaseOpeningTab(opening)
    throw error
  } finally {
    if (succeeded) load.complete()
    fileOpenCoordinator.remove(pendingOpen)
  }
}

export async function openFileInNewTab(
  file: File,
  handle?: FileSystemFileHandle,
  path?: string
): Promise<EditorStore> {
  const identity: DocumentSourceIdentity = { handle: handle ?? null, path: path ?? null }
  const input = { file, handle, path }
  const decision = await fileOpenCoordinator.decide(() => decideFileOpening(input, identity))
  if (decision.kind === 'existing') return decision.store
  if (decision.kind === 'pending') {
    await decision.completion
    return decision.store
  }
  return loadFileOpening(input, decision)
}
