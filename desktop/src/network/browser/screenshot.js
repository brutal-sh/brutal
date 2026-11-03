// Local capture preparation only; visited pages never receive app commands or image bytes.
function controlScreenshot(command) {
  const key = '__openPenScreenshot'
  const rootOverflow = () => {
    const root = getComputedStyle(document.documentElement).overflowY
    return root === 'visible' && document.body ? getComputedStyle(document.body).overflowY : root
  }
  let state = window[key]
  if (command.action === 'prepare') {
    if (state) throw new Error('A browser capture is already in progress.')
    const selected = command.scope === 'selected' ? window.__openPenElementPicker?.root() : null
    if (command.scope === 'selected' && !selected) throw new Error('Select the element again before capturing.')
    const elements = [...document.querySelectorAll('*')]
    if (elements.length > 50000) throw new Error('This page is too complex to capture safely.')
    state = {
      token: command.requestId, scope: command.scope, x: scrollX, y: scrollY, selected,
      animations: [], videos: [], styles: [], fixed: [], hidden: false
    }
    window[key] = state
    const save = (element, property, value) => {
      state.styles.push([element, property, element.style.getPropertyValue(property), element.style.getPropertyPriority(property)])
      element.style.setProperty(property, value, 'important')
    }
    for (const element of [document.documentElement, document.body].filter(Boolean)) {
      save(element, 'scroll-behavior', 'auto')
      save(element, 'scroll-snap-type', 'none')
    }
    for (const animation of document.getAnimations()) {
      if (animation.playState === 'running') { state.animations.push(animation); animation.pause() }
    }
    for (const video of document.querySelectorAll('video')) {
      if (!video.paused && !video.ended) { state.videos.push(video); video.pause() }
    }
    for (const element of elements) {
      if (element instanceof HTMLElement && !element.closest('[data-open-pen-picker]') && getComputedStyle(element).position === 'fixed')
        state.fixed.push([element, element.style.getPropertyValue('visibility'), element.style.getPropertyPriority('visibility')])
    }
    const rect = selected?.getBoundingClientRect()
    const root = document.scrollingElement ?? document.documentElement
    const overflow = rootOverflow()
    const clipped = ['hidden', 'clip'].includes(overflow)
    state.anchor = rect ? { x: rect.x + scrollX, y: rect.y + scrollY, width: rect.width, height: rect.height } : null
    state.box = rect ? {
      x: Math.floor(rect.x + scrollX), y: Math.floor(rect.y + scrollY),
      width: Math.ceil(rect.right + scrollX) - Math.floor(rect.x + scrollX),
      height: Math.ceil(rect.bottom + scrollY) - Math.floor(rect.y + scrollY)
    }
      : command.scope === 'full' && !clipped
        ? { x: 0, y: 0, width: root.scrollWidth, height: root.scrollHeight }
        : { x: scrollX, y: scrollY, width: innerWidth, height: innerHeight }
    state.viewportWidth = innerWidth
    state.viewportHeight = innerHeight
  }
  if (!state || state.token !== command.requestId) throw new Error('The browser capture expired. Try again.')
  const showFixed = visible => {
    for (const [element, value, priority] of state.fixed) {
      if (visible) {
        if (value) element.style.setProperty('visibility', value, priority)
        else element.style.removeProperty('visibility')
      } else element.style.setProperty('visibility', 'hidden', 'important')
    }
    state.hidden = !visible
  }
  if (command.action === 'restore') {
    try {
      showFixed(true)
      scrollTo({ left: state.x, top: state.y, behavior: 'instant' })
      for (const [element, property, value, priority] of state.styles) {
        if (value) element.style.setProperty(property, value, priority)
        else element.style.removeProperty(property)
      }
      for (const animation of state.animations) { try { animation.play() } catch {} }
      for (const video of state.videos) { try { video.play().catch(() => {}) } catch {} }
    } finally { delete window[key] }
    return { requestId: command.requestId, restored: true }
  }
  if (innerWidth !== state.viewportWidth || innerHeight !== state.viewportHeight)
    throw new Error('The browser size changed during capture. Try again.')
  if (state.selected && !state.selected.isConnected) throw new Error('The selected element was removed during capture.')
  if (command.action === 'measure' && state.scope === 'full') {
    const root = document.scrollingElement ?? document.documentElement
    if (!['hidden', 'clip'].includes(rootOverflow())) {
      state.box.width = root.scrollWidth
      state.box.height = root.scrollHeight
    }
  }
  if (command.action === 'scroll') {
    if (typeof command.x !== 'number' || typeof command.y !== 'number' || !Number.isFinite(command.x + command.y))
      throw new Error('Invalid capture position.')
    showFixed(!command.hideFixed)
    scrollTo({ left: command.x, top: command.y, behavior: 'instant' })
  }
  if (state.selected) {
    const rect = state.selected.getBoundingClientRect()
    if (Math.abs(rect.x + scrollX - state.anchor.x) > 0.5 || Math.abs(rect.y + scrollY - state.anchor.y) > 0.5 ||
      Math.abs(rect.width - state.anchor.width) > 0.5 || Math.abs(rect.height - state.anchor.height) > 0.5)
      throw new Error('The selected element moved during capture. Try again.')
  }
  // shortcut: root scrolling is captured; nested scrollers, sticky layouts and JS timers need separate qualification.
  return {
    requestId: command.requestId, url: location.href, title: document.title.slice(0, 512),
    box: state.box, viewportWidth: innerWidth, viewportHeight: innerHeight,
    x: scrollX, y: scrollY, pixelRatio: devicePixelRatio
  }
}
