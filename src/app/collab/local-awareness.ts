import { watch } from 'vue'
import type { Awareness } from 'y-protocols/awareness'

import type { EditorStore } from '@/app/editor/active-store'
import { presenceOf } from '@/app/presence/registry'

/** Publish our agents and their own palette colors while connected. */
export function publishLocalAgents(
  store: EditorStore,
  getAwareness: () => Awareness | null
): () => void {
  return watch(
    presenceOf(store).agents,
    (agents) => getAwareness()?.setLocalStateField('agents', agents),
    { immediate: true }
  )
}
