import { createComponentPropertyId } from '@open-pencil/scene-graph/components'
import { createSlotProperty, slotOwner, updateSlotProperty } from '@open-pencil/scene-graph/slots'

import type { Build } from './nodes'

/** Bind authored slot frames before instances copy their component's descendants. */
export function installPenSlots(build: Build): void {
  for (const [id, source] of build.effective) {
    if (!Array.isArray(source.slot)) continue
    const frame = build.graph.getNode(id)
    const owner = frame && slotOwner(build.graph, frame)
    const property = owner && createSlotProperty(build.graph, id, createComponentPropertyId())
    if (!owner || !property) throw new Error(`Cannot create .pen slot ${id}.`)
    updateSlotProperty(build.graph, owner.id, property.id, { preferredValues: [...source.slot] })
  }
}
