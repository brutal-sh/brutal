import { capturePendingLayout } from '@open-pencil/core/figma-api'
import { ALL_TOOLS, isToolExposed } from '@open-pencil/core/tools'
import { SceneGraph } from '@open-pencil/scene-graph'
import { captureGraphCheckpoint } from '@open-pencil/scene-graph/checkpoint'

import { loadDocument, measureDocumentText, populateWholeDocument } from '#cli/headless'
import { createHeadlessFigma, runHeadlessTool } from '#cli/tool-data'

import { interactiveOutput, saveInteractiveDocument } from './files'
import type { InteractiveCall } from './parse'

function toolError(value: unknown): string | undefined {
  if (value && typeof value === 'object' && 'error' in value && typeof value.error === 'string')
    return value.error
  return undefined
}

export async function createInteractiveSession(options: { input?: string; output: string }) {
  const output = interactiveOutput(options.output)
  const graph = options.input ? await loadDocument(options.input) : new SceneGraph()
  populateWholeDocument(graph)
  await measureDocumentText(graph)
  const figma = await createHeadlessFigma(graph)

  async function runTool(call: InteractiveCall): Promise<unknown> {
    if (!ALL_TOOLS.some((tool) => tool.name === call.name && isToolExposed(tool, 'mcp')))
      throw new Error(
        `Unknown tool "${call.name}". Run openpencil tool list to see available tools.`
      )
    const checkpoint = captureGraphCheckpoint(graph)
    const restoreLayout = capturePendingLayout(graph)
    const page = figma.currentPage
    const selection = [...page.selection]
    try {
      const result = await runHeadlessTool(figma, call.name, call.args)
      const error = toolError(result)
      if (error !== undefined) throw new Error(error)
      return result
    } catch (error) {
      try {
        checkpoint.restore()
      } finally {
        restoreLayout()
      }
      figma.currentPage = page
      page.selection = selection
      throw error
    }
  }

  async function run(call: InteractiveCall): Promise<{ exit: boolean; result?: unknown }> {
    if (call.name === 'save' || call.name === 'exit') {
      if (call.hasArgs) throw new Error(`${call.name}() does not accept arguments.`)
      if (call.name === 'exit') return { exit: true }
      await saveInteractiveDocument(graph, output.path)
      return { exit: false, result: { saved: output.path } }
    }
    return { exit: false, result: await runTool(call) }
  }

  return { run }
}
