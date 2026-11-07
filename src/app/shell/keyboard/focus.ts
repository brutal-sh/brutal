export function isInputElement(target: EventTarget | null | undefined): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && target.isContentEditable) ||
    (target instanceof Element && target.closest('[data-editor-input-surface]') !== null)
  )
}

export function isToggleInput(target: EventTarget | null | undefined): boolean {
  return (
    target instanceof HTMLInputElement && (target.type === 'checkbox' || target.type === 'radio')
  )
}

export function isControlActivation(event: KeyboardEvent): boolean {
  if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return false
  const enter = event.code === 'Enter' || event.code === 'NumpadEnter'
  if (!enter && event.code !== 'Space') return false
  return event
    .composedPath()
    .some(
      (target) =>
        target instanceof HTMLButtonElement ||
        (enter && target instanceof HTMLAnchorElement && target.hasAttribute('href'))
    )
}

export function isEditing(event: Event) {
  return event.composedPath().some(isInputElement)
}

/** Open overlays own navigation keys; history may still reach a paint picker. */
export function overlayHandlesKeyboard(event: KeyboardEvent, allowPickers = false): boolean {
  const picker = '[data-picker-content]'
  const accepts = (target: Element) => !(allowPickers && target.closest(picker))
  return (
    event
      .composedPath()
      .some(
        (target) =>
          target instanceof Element &&
          target.matches(
            '[data-picker-content], [role="dialog"], [role="listbox"], [role="menu"]'
          ) &&
          accepts(target)
      ) ||
    [...document.querySelectorAll('[data-dismissable-layer]:not([data-state="closed"])')].some(
      accepts
    )
  )
}

export function hasDocumentTextSelection(): boolean {
  const selection = window.getSelection()
  return selection !== null && !selection.isCollapsed && selection.toString().length > 0
}
