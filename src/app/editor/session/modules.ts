import { omit } from 'es-toolkit'
import { computed } from 'vue'

import type { Editor } from '@open-pencil/core'
import type { IORegistry } from '@open-pencil/core/io'
import { createSelectedNodeState } from '@open-pencil/vue/editor/selection-state'
import { panelMessages } from '@open-pencil/vue/i18n'

import { createDocumentExportActions } from '@/app/document/export'
import { createDocumentIOActions } from '@/app/document/io'
import type { ViewportSize } from '@/app/document/io/types'
import { createScriptRuntime } from '@/app/document/scripts/runtime'
import { createShaderSourceWatcher } from '@/app/document/shaders/watcher'
import { createDesignCheck } from '@/app/editor/design-check/session'
import { createFlashActions } from '@/app/editor/flash'
import { createMobileClipboardActions } from '@/app/editor/mobile-clipboard'
import { createPenActions } from '@/app/editor/pen'
import type { EditorPreparationController } from '@/app/editor/preparation/controller'
import { createProfilerActions } from '@/app/editor/profiler'
import type { AppEditorState } from '@/app/editor/session/types'
import { createVectorEditActions } from '@/app/editor/vector'
import { toast } from '@/app/shell/ui'

export function defineEditorStoreAccessors(store: object, editor: Editor) {
  Object.defineProperties(store, {
    graph: {
      enumerable: true,
      get: () => editor.graph
    },
    renderer: {
      enumerable: true,
      get: () => editor.renderer
    },
    canvasRenderers: {
      enumerable: true,
      get: () => editor.canvasRenderers
    },
    textEditor: {
      enumerable: true,
      get: () => editor.textEditor
    }
  })
}

export function createEditorComputedRefs(editor: Editor, state: AppEditorState) {
  const { nodes: selectedNodes, dispose: disposeSelection } = createSelectedNodeState(editor)

  const selectedNode = computed(() =>
    selectedNodes.value.length === 1 ? selectedNodes.value[0] : undefined
  )

  const layerTree = computed(() => {
    void state.sceneVersion
    return editor.getLayerTree()
  })

  return { selectedNodes, selectedNode, layerTree, disposeSelection }
}

function createEditingModules(editor: Editor, state: AppEditorState) {
  const flash = createFlashActions(editor, state)
  const pen = createPenActions(editor, state)
  const vectorEdit = createVectorEditActions(editor, state)
  return {
    ...flash,
    ...pen,
    ...vectorEdit,
    wrapInAutoLayout: () => editor.wrapInAutoLayout(true),
    async insertIcon(...args: Parameters<Editor['insertIcon']>) {
      try {
        return await editor.insertIcon(...args)
      } catch {
        toast.error(panelMessages.get().insertIconFailed)
        return null
      }
    },
    /** Going read-only keeps a vector edit in progress, as the editor keeps edited text. */
    setReadOnly(readOnly: boolean) {
      if (readOnly) vectorEdit.exitNodeEditMode(true)
      editor.setReadOnly(readOnly)
    }
  }
}

type EditorModuleArguments = [
  editor: Editor,
  state: AppEditorState,
  io: IORegistry,
  viewportSize: ViewportSize,
  preparationController: EditorPreparationController
]

export function createEditorStoreModules(
  ...[editor, state, io, viewportSize, preparationController]: EditorModuleArguments
) {
  const editing = createEditingModules(editor, state)
  const documentIO = createDocumentIOActions(editor, state, viewportSize, preparationController, io)
  const shaderSources = createShaderSourceWatcher(editor, {
    getDocumentPath: documentIO.getDocumentFilePath,
    adoptChanges: (apply) => documentIO.adoptChanges(apply)
  })
  const scriptRuntime = createScriptRuntime(editor, io, {
    getDocumentPath: documentIO.getDocumentFilePath,
    adoptChanges: (apply) => documentIO.adoptChanges(apply)
  })
  const documentExport = createDocumentExportActions(editor, state, io, documentIO.downloadBlob)
  const mobileClipboard = createMobileClipboardActions(editor)
  const profiler = createProfilerActions(editor)
  const designCheck = createDesignCheck(editor, state)

  return {
    ...editing,
    attachScriptSource: scriptRuntime.attachScriptSource,
    reloadScript: scriptRuntime.reloadScript,
    scriptRuntimeStates: scriptRuntime.scriptRuntimeStates,
    collectScriptSources: scriptRuntime.collectScriptSources,
    watchShaderSource: shaderSources.watchShaderSource,
    shaderSourceErrors: shaderSources.shaderSourceErrors,
    shaderSourceOrder: shaderSources.shaderSourceOrder,
    ...omit(documentIO, ['downloadBlob', 'disposeDocumentIO']),
    designCheck,
    dispose: () => {
      scriptRuntime.dispose()
      shaderSources.dispose()
      designCheck.dispose()
      editor.releaseGraphResources()
      editor.dispose()
      editor.clearPageViewports()
      documentIO.disposeDocumentIO()
      preparationController.dispose()
    },
    ...documentExport,
    ...mobileClipboard,
    ...profiler
  }
}
