import { expect, test } from 'bun:test'

import { ref } from 'vue'

import { useToolAccess } from '@/app/automation/tool-access/settings/list'
import type { ToolAccessEntry } from '@/app/automation/tool-access/types'

const tools = ref<ToolAccessEntry[]>([
  { name: 'save', description: 'Save by URI', effect: 'write' },
  { name: 'save_file', description: 'Save by ID', effect: 'write' },
  { name: 'inspect', description: 'Inspect', effect: 'read' }
])

test.each(['save', 'save_file'])(
  'stored %s denial disables both save controls and counts',
  (name) => {
    const disabled = ref([name, 'unknown'])
    const access = useToolAccess(tools, disabled)
    expect(access.enabledCount.value).toBe(1)
    expect(access.modificationEnabled.value).toBe(false)
    expect(access.groups.value.find((group) => group.effect === 'write')?.counts).toEqual({
      enabled: 0,
      total: 2
    })
    access.setToolEnabled(name, true)
    expect(disabled.value).toEqual(['unknown'])
    expect(access.enabledCount.value).toBe(3)
    access.setToolEnabled(name, false)
    expect(disabled.value).toEqual(['unknown', 'save', 'save_file'])
    expect(access.enabledCount.value).toBe(1)
    access.setGroupEnabled('write', true)
    expect(disabled.value).toEqual(['unknown'])
  }
)
