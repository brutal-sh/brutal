import type { SceneNode } from '@open-pencil/scene-graph'
import type { Vector } from '@open-pencil/scene-graph/primitives'

import type { ImageAttachmentMediaType } from '@/app/ai/attachment/image/types'

export interface AttachmentBase {
  id: string
  messageId: string
  kind: 'image' | 'node' | 'file'
  name: string
  preview: Blob
}

export interface ImagePresentation extends AttachmentBase {
  kind: 'image'
  mediaType: ImageAttachmentMediaType
  originalSize: Vector
}

export interface NodePresentation extends AttachmentBase {
  kind: 'node'
  nodeId: string
  nodeType: SceneNode['type']
  originalSize: Vector
}

export interface TextPresentation extends AttachmentBase {
  kind: 'file'
  mediaType: string
  text: string
}

export type AttachmentPresentation = ImagePresentation | NodePresentation | TextPresentation
