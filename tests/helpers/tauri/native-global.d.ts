/// <reference types="@wdio/globals/types" />

import type * as TauriAPI from '@tauri-apps/api'
import type * as TauriOS from '@tauri-apps/plugin-os'

import type { SnappingPreferences } from '@open-pencil/core'

import type { OpenPencilWindowAPI } from '@/app/browser-bridge'
import type { EditorStore } from '@/app/editor/active-store'

export {}

type NativeTestNode = {
  childIds?: string[]
  id: string
  name?: string
  parentId?: string | null
  componentId?: string | null
  type: string
  text?: string
  width?: number
  height?: number
  fills?: Array<{ type: string; imageHash?: string }>
}

type NativeTestStore = {
  undo: { clear: () => void; readonly canUndo: boolean }
  getDocumentFilePath: EditorStore['getDocumentFilePath']
  hasUnsavedChanges: EditorStore['hasUnsavedChanges']
  saveFigFileToPath: EditorStore['saveFigFileToPath']
  createScript: EditorStore['createScript']
  createInstanceFromComponent: EditorStore['createInstanceFromComponent']
  attachScriptSource: EditorStore['attachScriptSource']
  openFigFile: EditorStore['openFigFile']
  state: {
    documentName: string
    zoom: EditorStore['state']['zoom']
    snappingPreferences: SnappingPreferences
    currentPageId: string
    editingTextId: string | null
    selectedIds: Set<string>
    renderVersion: number
    sceneVersion: number
  }
  graph: {
    images: Map<string, Uint8Array>
    createNode: (type: string, parentId: string, changes: Record<string, unknown>) => NativeTestNode
    deleteNode: (id: string) => void
    getChildren: (id: string) => NativeTestNode[]
    getNode: (id: string) => NativeTestNode | undefined
    updateNode: (id: string, changes: Record<string, unknown>) => void
  }
  createShape: (type: string, x: number, y: number, width: number, height: number) => string
  requestRender: () => void
  zoomToLevel: EditorStore['zoomToLevel']
  select: (ids: string[]) => void
  startTextEditing: (id: string) => void
  textEditor?: {
    selectAll: () => void
    selectWord: (position: number) => void
    getSelectedText: () => string
  }
}

declare global {
  interface Window {
    __TAURI__?: Pick<typeof TauriAPI, 'core' | 'event'> & { os?: typeof TauriOS }
    openPencil?: {
      getStore?: () => NativeTestStore
      setChatTransport?: OpenPencilWindowAPI['setChatTransport']
    }
  }
}
