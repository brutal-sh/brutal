import type { Page } from '@playwright/test'

export async function beginProfilerCapture(page: Page): Promise<void> {
  await page.evaluate(() => {
    const profiler = window.openPencil?.getStore?.()?.renderer?.profiler
    if (!profiler) throw new Error('Renderer is not ready')
    profiler.beginCapture()
  })
}

export async function downloadProfilerCapture(page: Page): Promise<void> {
  await page.evaluate(() => {
    const profiler = window.openPencil?.getStore?.()?.renderer?.profiler
    if (!profiler) throw new Error('Renderer is not ready')
    if (!profiler.endCapture()) throw new Error('No renderer capture is active')
    profiler.downloadSpeedscope()
  })
}
