import { isEqual } from 'es-toolkit/predicate'

import type { Editor } from '@open-pencil/core'
import type { IORegistry } from '@open-pencil/core/io'
import { parseScriptHeader, type ScriptInput } from '@open-pencil/core/scripts/header'
import { scriptReferenceDocument } from '@open-pencil/core/scripts/references'
import {
  markScriptOutputCurrent,
  scriptOfNode,
  type ScriptDefinition
} from '@open-pencil/scene-graph/scripts'

import { scriptExcerpt } from '@/app/document/scripts/diagnostics'
import type { evaluateCanvasScript } from '@/app/document/scripts/evaluate'
import { scriptErrorGraph } from '@/app/document/scripts/status'

import { declaredScriptInputs } from './inputs'
import { scriptPlaceholderDocument } from './placeholder'
import type { ScriptRun, ScriptRuntimeState } from './state'

function captureScriptTarget(editor: Editor, id: string) {
  const graph = editor.graph
  const node = graph.getNode(id)
  if (!node) return undefined
  return { graph, node, size: { width: node.width, height: node.height } }
}

interface ScriptRenderingOptions {
  states: Map<string, ScriptRuntimeState>
  references: Map<string, Set<string>>
  sourceFor: (uri: string, id: string) => Promise<string>
  inputKey: (id: string, definition: ScriptDefinition) => string
  currentRun: (id: string, run: ScriptRun) => boolean
  adoptChanges<T>(apply: () => T): T
  evaluate?: typeof evaluateCanvasScript
}

interface ScriptRenderingContext {
  editor: Editor
  io: IORegistry
  options: ScriptRenderingOptions
  evaluate: typeof evaluateCanvasScript
}
interface ScriptRequest {
  id: string
  definition: ScriptDefinition
  run: ScriptRun
}
type ScriptTarget = NonNullable<ReturnType<typeof captureScriptTarget>>
interface ScriptFailure {
  target: ScriptTarget
  current: () => boolean
  definitions: ScriptInput[]
  source?: string
  errorLine?: number
  errorStack?: string
  errorName: string
}

export function createScriptRenderer(
  editor: Editor,
  io: IORegistry,
  options: ScriptRenderingOptions
) {
  const evaluate =
    options.evaluate ??
    (async (...args: Parameters<typeof evaluateCanvasScript>) => {
      const { evaluateCanvasScript } = await import('@/app/document/scripts/evaluate')
      return evaluateCanvasScript(...args)
    })
  const context = { editor, io, options, evaluate }
  return {
    render: (id: string, definition: ScriptDefinition, run: ScriptRun) =>
      render(context, { id, definition, run }),
    renderEmpty: (id: string, definition: ScriptDefinition, run: ScriptRun) =>
      renderEmpty(context, { id, definition, run })
  }
}

function currentRender(
  context: ScriptRenderingContext,
  request: ScriptRequest,
  target: ScriptTarget
) {
  const { editor, options } = context
  const { inputKey } = options
  const { id, definition, run } = request
  const { graph, node, size } = target
  const componentId = node.componentId
  const variables = inputKey(id, definition)
  return () =>
    options.currentRun(id, run) &&
    editor.graph === graph &&
    isEqual(scriptOfNode(graph.getNode(id) ?? node), definition) &&
    graph.getNode(id)?.width === size.width &&
    graph.getNode(id)?.height === size.height &&
    graph.getNode(id)?.componentId === componentId &&
    inputKey(id, definition) === variables
}

async function render(context: ScriptRenderingContext, request: ScriptRequest) {
  const { editor, io, options, evaluate } = context
  const { states, references, sourceFor } = options
  const { id, definition, run } = request
  const target = captureScriptTarget(editor, id)
  if (!target) return
  const { graph, node, size } = target
  const current = currentRender(context, request, target)
  const failure: ScriptFailure = {
    target,
    current,
    definitions: [],
    errorName: 'Error'
  }
  try {
    failure.source = await sourceFor(definition.uri, id)
    if (!current()) return
    failure.definitions = parseScriptHeader(failure.source)
    states.set(id, { loading: true, definitions: failure.definitions })
    const result = await evaluate(
      failure.source,
      size.width,
      size.height,
      declaredScriptInputs(graph, node, definition, failure.definitions),
      run.controller.signal,
      true,
      definition.uri
    )
    if (!current()) return
    if (!result.ok) {
      failure.errorLine = result.line
      failure.errorStack = result.stack
      failure.errorName = result.errorName ?? 'Error'
      throw new Error(result.error)
    }
    const dependencies = new Set<string>()
    references.set(id, dependencies)
    const reference = scriptReferenceDocument(graph, id, result.nodes, dependencies)
    const document = await io.readDocument({
      name: 'script-output.pen',
      data: new TextEncoder().encode(JSON.stringify(reference.penDocument))
    })
    if (!current()) return
    if (reference.dependencyId) document.graph.deleteNode(reference.dependencyId)
    options.adoptChanges(() => editor.replaceScriptOutput(id, definition, size, document.graph))
    states.set(id, { loading: false, definitions: result.definitions })
  } catch (error) {
    await renderFailure(context, request, failure, error)
  }
}

async function renderFailure(
  context: ScriptRenderingContext,
  request: ScriptRequest,
  failure: ScriptFailure,
  error: unknown
) {
  const { editor, io, options } = context
  const { states } = options
  const { id, definition } = request
  const {
    target: { graph, size },
    current,
    definitions,
    source,
    errorLine,
    errorStack,
    errorName
  } = failure
  if (!current()) return
  const message = (error instanceof Error ? error.message : String(error)).slice(0, 2_000)
  try {
    const status = await scriptErrorGraph(
      io,
      size,
      {
        title: source === undefined ? 'Script not found' : 'Script runtime error',
        description:
          source === undefined
            ? `We could not find “${definition.uri}” at this path. Check for typos or missing folders.`
            : `${errorName}: ${message}${errorStack ? `\n${errorStack}` : ''}`,
        code: source !== undefined && errorLine ? scriptExcerpt(source, errorLine) : undefined
      },
      () => (current() ? editor.renderer : null)
    )
    if (!current()) return
    options.adoptChanges(() => {
      editor.replaceScriptOutput(id, definition, size, status)
      markScriptOutputCurrent(graph, id, 'diagnostic')
    })
  } catch (statusError) {
    console.warn('Script diagnostic could not be rendered.', statusError)
  }
  if (current())
    states.set(id, {
      loading: false,
      definitions,
      error: message
    })
}

async function renderEmpty(context: ScriptRenderingContext, request: ScriptRequest) {
  const { editor, io, options } = context
  const { id, definition, run } = request
  const target = captureScriptTarget(editor, id)
  if (!target) return
  const { graph, size } = target
  const document = await io.readDocument({
    name: 'script-placeholder.pen',
    data: new TextEncoder().encode(JSON.stringify(scriptPlaceholderDocument(size)))
  })
  if (options.currentRun(id, run) && editor.graph === graph)
    options.adoptChanges(() => editor.replaceScriptOutput(id, definition, size, document.graph))
}
