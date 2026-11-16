import type { FigmaAPI } from '@open-pencil/core/figma-api'

import { agentSessionOpened, endAgentSession } from '@/app/automation/agents'
import {
  handleActivateDocument,
  handleGetSettings,
  handleListRecentFiles,
  handleRedo,
  handleUndo,
  handleUpdateSettings
} from '@/app/automation/bridge/app-handlers'
import { createAutomationEvalHandler } from '@/app/automation/bridge/eval-handler'
import { handleExport, handleExportJSX } from '@/app/automation/bridge/export-handlers'
import { createFileHandlers, type AutomationFiles } from '@/app/automation/bridge/file-handlers'
import { handleRPCFallback } from '@/app/automation/bridge/rpc-handler'
import { handleURISave } from '@/app/automation/bridge/save-uri'
import { handleSelection } from '@/app/automation/bridge/selection-handler'
import {
  isUnknownRecord,
  listAutomationDocuments,
  resolveAutomationTarget,
  responseWithTarget,
  stripAutomationTargetArgs,
  type AutomationTarget,
  type UnknownRecord
} from '@/app/automation/bridge/target'
import { createAutomationToolHandler } from '@/app/automation/bridge/tool-handlers'
import type { EditorStore } from '@/app/editor/active-store'

type FigmaFactory = (store: EditorStore, pageId?: string) => FigmaAPI

type CommandHandler = (
  target: AutomationTarget,
  args: unknown,
  signal?: AbortSignal,
  beforeWrite?: () => void
) => Promise<unknown>
type CommandHandlers = Partial<Record<string, CommandHandler>>
interface RequestContext {
  handlers: CommandHandlers
  signal?: AbortSignal
  files?: AutomationFiles
}

function handleSessionClosed(_store: EditorStore, args: unknown) {
  const session = isUnknownRecord(args) ? args.session : undefined
  if (typeof session === 'string') endAgentSession(session)
  return { ok: true, result: null }
}

const globalHandlers: Partial<Record<string, (store: EditorStore, args: unknown) => unknown>> = {
  list_documents: (store) => ({
    ok: true,
    result: { documents: listAutomationDocuments(store), unique_document_ids: true }
  }),
  list_recent_files: handleListRecentFiles,
  agent_session_opened: (_store, args) => {
    agentSessionOpened(args)
    return { ok: true, result: null }
  },
  agent_session_closed: handleSessionClosed,
  get_settings: handleGetSettings,
  update_settings: (_store, args) => handleUpdateSettings(args)
}

/** Runs a command on its resolved document page, loading that page when necessary. */
async function dispatchTargetCommand(
  target: AutomationTarget,
  command: string,
  args: UnknownRecord,
  context: RequestContext
): Promise<unknown> {
  const { handlers, signal } = context
  signal?.throwIfAborted()
  // Refused selection must not populate or lay out an offscreen page.
  if (
    command === 'tool' &&
    args.name === 'select_nodes' &&
    target.pageId !== target.store.state.currentPageId
  )
    throw new Error('The target page is no longer visible in this document')
  if (!(await target.store.preparePageNodes(target.pageId)))
    throw new Error(`Page "${target.pageId}" was closed before it finished loading`)
  signal?.throwIfAborted()
  const handler = handlers[command]
  const result = handler
    ? await handler(target, args, signal)
    : await handleRPCFallback(target, command, args)
  return responseWithTarget(result, target)
}

async function dispatchRequest(
  store: EditorStore,
  command: string,
  args: unknown,
  context: RequestContext
): Promise<unknown> {
  const { handlers, signal } = context
  signal?.throwIfAborted()
  if (command === 'save_uri') {
    const save = handlers.save_file
    if (!save) throw new Error('Document Save is unavailable')
    return handleURISave(args, { files: context.files, signal, save })
  }
  const globalHandler = Object.hasOwn(globalHandlers, command) ? globalHandlers[command] : undefined
  if (globalHandler) return globalHandler(store, args)
  if (command === 'open_file' || command === 'new_document') {
    const handler = handlers[command]
    if (handler) return handler(resolveAutomationTarget(store, undefined), args)
  }
  const rawArgs = isUnknownRecord(args) ? args : {}
  const target = resolveAutomationTarget(store, rawArgs)
  return dispatchTargetCommand(target, command, stripAutomationTargetArgs(rawArgs), context)
}

export function createAutomationCommandHandlers(makeFigma: FigmaFactory, files?: AutomationFiles) {
  const handleEval = createAutomationEvalHandler(makeFigma)
  const handleTool = createAutomationToolHandler(makeFigma)
  const { handleSaveFile, handleCloseFile, handleNewDocument, handleOpenFile } =
    createFileHandlers(files)

  const commandHandlers: CommandHandlers = {
    eval: handleEval,
    tool: handleTool,
    export: handleExport,
    export_jsx: handleExportJSX,
    selection: handleSelection,
    save_file: handleSaveFile,
    close_file: handleCloseFile,
    new_document: handleNewDocument,
    open_file: handleOpenFile,
    activate_document: handleActivateDocument,
    undo: handleUndo,
    redo: handleRedo
  }

  return {
    handleRequest: (store: EditorStore, command: string, args: unknown, signal?: AbortSignal) =>
      dispatchRequest(store, command, args, { handlers: commandHandlers, signal, files }),
    handleTargetCommand: (target: AutomationTarget, command: string, args: UnknownRecord) =>
      dispatchTargetCommand(target, command, args, { handlers: commandHandlers })
  }
}
