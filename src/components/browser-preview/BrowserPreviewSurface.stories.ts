import type { Meta, StoryObj } from '@storybook/vue3-vite'

import BrowserPreviewHeightPlayground from './examples/BrowserPreviewHeightPlayground.vue'

interface Args {
  preset: string
  manual: boolean
}

const meta = {
  title: 'App/Browser Preview/Import Height',
  component: BrowserPreviewHeightPlayground,
  args: { preset: 'desktop', manual: false }
} satisfies Meta<Args>
export default meta
type Story = StoryObj<Omit<typeof meta, 'component'>>

export const Desktop: Story = {}
export const Phone: Story = { args: { preset: 'phone' } }
export const Tablet: Story = { args: { preset: 'tablet' } }
export const PendingBackdrop: Story = { args: { manual: true } }
