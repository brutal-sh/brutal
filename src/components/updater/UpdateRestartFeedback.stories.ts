import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, userEvent, waitFor, within } from 'storybook/test'

import UpdateRestartFeedback from './examples/UpdateRestartFeedback.vue'

type Args = { scenario: 'denied' | 'reject-once' }
type Story = StoryObj<Args>

const meta = {
  title: 'App/Shell/Update Restart',
  component: UpdateRestartFeedback,
  parameters: { layout: 'centered' }
} satisfies Meta<Args>
export default meta

const restart: Story['play'] = async ({ canvasElement, args }) => {
  const canvas = within(canvasElement)
  const prompt = canvasElement.querySelector('[data-slot="update-prompt"]')
  await waitFor(() => expect(prompt).toHaveAttribute('data-status', 'available'))
  const controls = canvas.getAllByRole('button')
  await expect(controls).toHaveLength(2)
  const [, install] = controls
  await userEvent.click(install)
  await waitFor(() => expect(prompt).toHaveAttribute('data-status', 'installed'))
  const installedControls = canvas.getAllByRole('button')
  await expect(installedControls).toHaveLength(2)
  const [, restartNow] = installedControls
  await userEvent.click(restartNow)
  await waitFor(() => expect(canvas.getByLabelText('confirmRestart calls')).toHaveTextContent('1'))
  await waitFor(() =>
    expect(prompt).toHaveAttribute(
      'data-status',
      args.scenario === 'denied' ? 'installed' : 'failed'
    )
  )
  await expect(canvas.getByLabelText('relaunch calls')).toHaveTextContent(
    args.scenario === 'denied' ? '0' : '1'
  )
}

export const Denied: Story = { args: { scenario: 'denied' }, play: restart }
export const RelaunchRejected: Story = { args: { scenario: 'reject-once' }, play: restart }
