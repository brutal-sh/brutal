import { watchEffect } from 'vue'

import { POINTER_ARROW } from '@open-pencil/core/constants'

import { appPreferences } from '@/app/settings/preferences/store'

function arrowImage(mirrored: boolean): string {
  const { size, tipX, tipY, path } = POINTER_ARROW
  const transform = mirrored ? ` transform="translate(${size} 0) scale(-1 1)"` : ''
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><path d="${path}"${transform} fill="#151515" stroke="white" stroke-width="1.6" stroke-linejoin="round"/></svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${mirrored ? size - tipX : tipX} ${tipY}`
}

const rightArrow = arrowImage(false)
const leftArrow = arrowImage(true)

/** App-wide so dialogs and menus rendered through portals inherit the selected pointer. */
export function usePointerStyle(): void {
  watchEffect(() => {
    const style = document.documentElement.style
    const pointer = appPreferences.value.appearance.pointer
    if (pointer === 'system') {
      style.removeProperty('--custom-app-pointer')
      style.removeProperty('--custom-app-link-pointer')
      return
    }
    const arrow = pointer === 'left' ? leftArrow : rightArrow
    style.setProperty('--custom-app-pointer', `${arrow}, default`)
    style.setProperty('--custom-app-link-pointer', `${arrow}, pointer`)
  })
}
