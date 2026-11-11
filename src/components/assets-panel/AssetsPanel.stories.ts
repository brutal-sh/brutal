import type { Meta, StoryObj } from '@storybook/vue3-vite'

import AssetsPanelPlayground from './examples/AssetsPanelPlayground.vue'

interface Args {
  workspace: boolean
}
const meta = {
  title: 'App/Assets Panel',
  component: AssetsPanelPlayground,
  args: { workspace: false }
} satisfies Meta<Args>
export default meta
type Story = StoryObj<Omit<typeof meta, 'component'>>

export const Legacy: Story = {}
export const Workspace: Story = { args: { workspace: true } }
