import RELEASE_SYNC from '@jitl/quickjs-wasmfile-release-sync'
import wasmURL from '@jitl/quickjs-wasmfile-release-sync/wasm?url'
import { toUint8Array } from 'js-base64'
import {
  memoizePromiseFactory,
  newQuickJSWASMModuleFromVariant,
  newVariant
} from 'quickjs-emscripten-core'

// The inline worker is built in library mode, so this asset is embedded rather than fetched.
export const loadScriptVM = memoizePromiseFactory(() =>
  newQuickJSWASMModuleFromVariant(
    newVariant(RELEASE_SYNC, {
      wasmLocation: wasmURL,
      wasmBinary: new Uint8Array(toUint8Array(wasmURL.slice(wasmURL.indexOf(',') + 1))).buffer
    })
  )
)
