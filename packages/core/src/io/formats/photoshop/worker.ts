import { decodePhotoshopLayers } from './decode'

self.onmessage = async (event: MessageEvent<ArrayBuffer>) => {
  self.postMessage(await decodePhotoshopLayers(event.data), { transfer: [] })
}
