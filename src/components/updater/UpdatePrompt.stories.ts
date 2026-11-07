import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, fn, userEvent, within } from 'storybook/test'

import type { ReleaseInfo, UpdaterState } from '@/app/shell/updater/session'

import UpdatePrompt from './UpdatePrompt.vue'

// Fictitious release data for the component workshop; no update is published or installed.
const release: ReleaseInfo = {
  version: '0.16.1',
  currentVersion: '0.16.0',
  notes: `### Example release notes

- Recover unsaved designs in Open Pen.
- Keep local document editing available without an editor subscription.
- Read this fork’s change history from the update window.`
}

type Args = {
  state: UpdaterState
  currentVersion: string
  installQuitsApp?: boolean
  onInstall?: () => void
  onCancel?: () => void
  onRestart?: () => void
  onRetry?: () => void
  onDismiss?: () => void
}
type Story = StoryObj<Args>

const meta = {
  title: 'App/Shell/Update Prompt',
  component: UpdatePrompt,
  parameters: { layout: 'centered' },
  args: {
    currentVersion: '0.16.0',
    onInstall: fn(),
    onCancel: fn(),
    onRestart: fn(),
    onRetry: fn(),
    onDismiss: fn()
  },
  render: (args) => ({
    components: { UpdatePrompt },
    setup: () => ({ args }),
    // The size the Software Update window opens at.
    template:
      '<div class="h-[520px] w-[560px] overflow-hidden rounded-lg border border-border"><UpdatePrompt v-bind="args" /></div>'
  })
} satisfies Meta<Args>

export default meta

export const Available: Story = {
  args: { state: { status: 'available', release } },
  play: async ({ canvasElement, args }) => {
    const controls = within(canvasElement).getAllByRole('button')
    await expect(controls).toHaveLength(2)
    const [later, install] = controls
    await userEvent.click(install)
    await expect(args.onInstall).toHaveBeenCalledTimes(1)
    await userEvent.click(later)
    await expect(args.onDismiss).toHaveBeenCalledTimes(1)
  }
}

export const WithoutNotes: Story = {
  ...Available,
  args: { state: { status: 'available', release: { ...release, notes: '' } } }
}

export const Downloading: Story = {
  args: {
    state: {
      status: 'downloading',
      release,
      progress: { downloaded: 23_500_000, total: 61_200_000 }
    }
  },
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole('button'))
    await expect(args.onCancel).toHaveBeenCalledTimes(1)
  }
}

export const DownloadingUnknownSize: Story = {
  ...Downloading,
  args: { state: { status: 'downloading', release, progress: { downloaded: 23_500_000 } } }
}

export const AvailableOnWindows: Story = {
  ...Available,
  args: { state: { status: 'available', release }, installQuitsApp: true }
}

const retryFailure: Story['play'] = async ({ canvasElement, args }) => {
  const controls = within(canvasElement).getAllByRole('button')
  await expect(controls).toHaveLength(2)
  const [later, retry] = controls
  await userEvent.click(retry)
  await expect(args.onRetry).toHaveBeenCalledTimes(1)
  await userEvent.click(later)
  await expect(args.onDismiss).toHaveBeenCalledTimes(1)
}

export const DownloadFailed: Story = {
  play: retryFailure,
  args: {
    state: { status: 'failed', step: 'download', release, error: 'connection reset' }
  }
}

export const Installed: Story = {
  args: { state: { status: 'installed', release } },
  play: async ({ canvasElement, args }) => {
    const controls = within(canvasElement).getAllByRole('button')
    await expect(controls).toHaveLength(2)
    const [later, restart] = controls
    await userEvent.click(restart)
    await expect(args.onRestart).toHaveBeenCalledTimes(1)
    await userEvent.click(later)
    await expect(args.onDismiss).toHaveBeenCalledTimes(1)
  }
}

export const Installing: Story = {
  args: { state: { status: 'installing', release } },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).queryByRole('button')).not.toBeInTheDocument()
  }
}

export const InstallFailed: Story = {
  play: retryFailure,
  args: {
    state: { status: 'failed', step: 'install', release, error: 'signature verification failed' }
  }
}

export const Checking: Story = {
  args: { state: { status: 'checking' } },
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole('button'))
    await expect(args.onDismiss).toHaveBeenCalledTimes(1)
  }
}

export const UpToDate: Story = {
  ...Checking,
  args: { state: { status: 'up-to-date' } }
}

export const CheckFailed: Story = {
  play: retryFailure,
  args: { state: { status: 'failed', step: 'check', error: 'network unreachable' } }
}

export const Unavailable: Story = {
  play: retryFailure,
  args: { state: { status: 'failed', step: 'check', error: 'No valid release JSON found' } }
}
