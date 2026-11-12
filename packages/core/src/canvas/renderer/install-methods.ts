import { mapValues } from 'es-toolkit'

export function installRendererMethods(prototype: object, methods: object): void {
  Object.defineProperties(
    prototype,
    mapValues(Object.getOwnPropertyDescriptors(methods), (descriptor) => ({
      ...descriptor,
      enumerable: false
    }))
  )
}
