import type { OpenPencilWindowAPI } from './app/browser-bridge'
import type { TurnstileAPI } from './app/cloud/waitlist/turnstile'
import type { ScreenEyeDropper } from './app/editor/color-sampling'

export {}

declare global {
  interface FilePickerAcceptType {
    description: string
    accept: Record<string, string[]>
  }

  interface FilePickerOptions {
    multiple?: boolean
    types?: FilePickerAcceptType[]
    suggestedName?: string
  }

  interface DataTransferItem {
    /** File System Access drag support; Chromium only. */
    getAsFileSystemHandle?(): Promise<FileSystemHandle | null>
  }

  interface Window {
    /** Optional Chromium screen sampler; native macOS uses AppKit. */
    EyeDropper?: new () => ScreenEyeDropper
    openPencil?: OpenPencilWindowAPI
    showOpenFilePicker?(options?: FilePickerOptions): Promise<FileSystemFileHandle[]>
    showSaveFilePicker?(options?: FilePickerOptions): Promise<FileSystemFileHandle>
    mockWindowOpen?(url: string): void
    /** Cloudflare Turnstile, once its script has loaded. */
    turnstile?: TurnstileAPI
  }
}
