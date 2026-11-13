import webpWasm from 'canvaskit-wasm/bin/full/canvaskit.wasm?url'

import { createWebPEncoder } from './encode'

// Initialize the full codec only for fallback; the PWA may pre-cache its binary.
export const encodeWebP = createWebPEncoder(async () => {
  const { default: initialize } = await import('canvaskit-wasm/full')
  return initialize({ locateFile: () => webpWasm })
})
