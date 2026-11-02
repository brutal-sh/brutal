// Own page-side picker. It has no app IPC, filesystem or network access.
function controlPicker(command) {
  const key = '__openPenElementPicker'
  let picker = window[key]
  if (command.action === 'start' && !picker) {
    const host = document.createElement('div')
    host.setAttribute('data-open-pen-picker', '')
    host.style.cssText = 'all:initial;position:fixed;inset:0;pointer-events:none;z-index:2147483647'
    const shadow = host.attachShadow({ mode: 'closed' })
    const outline = document.createElement('div')
    outline.style.cssText = 'position:absolute;display:none;box-sizing:border-box;pointer-events:none;background:rgba(61,153,255,.1);outline:1px solid #3D99FF;outline-offset:-1px'
    const label = document.createElement('span')
    label.style.cssText = 'position:absolute;left:0;bottom:100%;max-width:60vw;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;border-radius:4px;padding:2px 4px;background:#3D99FF;color:white;font:12px/1 Inter,system-ui,sans-serif'
    outline.append(label)
    shadow.append(outline)
    document.documentElement.append(host)
    const cursor = document.createElement('style')
    document.documentElement.append(cursor)
    let picking = true
    let selected = null
    let hovered = null
    let suspended = false
    let action = null
    let rememberedChild = null
    const properties = [
      'display', 'position', 'top', 'right', 'bottom', 'left', 'z-index', 'flex-direction',
      'justify-content', 'align-items', 'gap', 'background-color', 'background-image',
      'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
      'border-top-style', 'border-top-color', 'border-top-left-radius', 'border-top-right-radius',
      'border-bottom-right-radius', 'border-bottom-left-radius', 'padding-top', 'padding-right',
      'padding-bottom', 'padding-left', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
      'font-family', 'color', 'font-size', 'font-weight', 'line-height', 'letter-spacing',
      'opacity', 'box-shadow'
    ]
    const tag = element => element.tagName.toLowerCase()
    const valid = element => element instanceof Element && element.isConnected &&
      element !== host && element !== cursor && !host.contains(element) &&
      !['html', 'head', 'script', 'style', 'link', 'meta'].includes(tag(element))
    const ancestors = () => {
      const path = []
      for (let element = selected; element && path.length < 64; element = element.parentElement) {
        if (tag(element) === 'html') break
        path.unshift(element)
      }
      return path
    }
    function draw() {
      const target = hovered?.isConnected ? hovered : selected?.isConnected ? selected : null
      cursor.textContent = picking && !suspended ? 'html,html *{cursor:crosshair!important}' : ''
      host.style.display = suspended ? 'none' : 'block'
      if (!target) {
        outline.style.display = 'none'
        return
      }
      const rect = target.getBoundingClientRect()
      Object.assign(outline.style, {
        display: 'block', left: `${rect.x}px`, top: `${rect.y}px`,
        width: `${rect.width}px`, height: `${rect.height}px`,
        outlineWidth: target === selected ? '1px' : '2px'
      })
      label.textContent = tag(target)
      label.style.bottom = rect.top < 18 ? 'auto' : '100%'
      label.style.top = rect.top < 18 ? '0' : 'auto'
    }
    function select(element) {
      if (!valid(element)) return
      selected = element
      hovered = null
      picking = false
      draw()
    }
    const move = event => {
      if (suspended || (!picking && !selected)) return
      hovered = valid(event.target) ? event.target : null
      draw()
    }
    const leave = () => { hovered = null; draw() }
    const click = event => {
      if (suspended || (!picking && !selected) || !valid(event.target)) return
      event.preventDefault()
      event.stopImmediatePropagation()
      select(event.target)
    }
    const keydown = event => {
      if (suspended || (!picking && !selected)) return
      const keys = ['Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter']
      if (!keys.includes(event.key) || event.altKey) return
      event.preventDefault()
      event.stopImmediatePropagation()
      if (event.key === 'Escape') { picking = false; selected = null; hovered = null; action = null; draw(); return }
      if (!selected?.isConnected) return
      if (event.key === 'Enter') { action = event.metaKey || event.ctrlKey ? 'capture' : 'import'; return }
      if (event.key === 'ArrowUp' && valid(selected.parentElement)) {
        rememberedChild = selected
        select(selected.parentElement)
      } else if (event.key === 'ArrowDown') {
        select(rememberedChild?.parentElement === selected ? rememberedChild : selected.firstElementChild)
      } else if (event.key === 'ArrowLeft') select(selected.previousElementSibling)
      else if (event.key === 'ArrowRight') select(selected.nextElementSibling)
    }
    window.addEventListener('pointermove', move, true)
    window.addEventListener('mouseleave', leave, true)
    window.addEventListener('click', click, true)
    window.addEventListener('keydown', keydown, true)
    window.addEventListener('scroll', draw, true)
    window.addEventListener('resize', draw)
    picker = {
      start() { picking = true; hovered = null; action = null; draw() },
      selectIndex(index) { select(ancestors()[index]) },
      root() {
        if (selected && !selected.isConnected) throw new Error('The selected element is no longer available. Select it again.')
        return selected
      },
      stage(value) { suspended = value; hovered = null; draw() },
      read() {
        if (selected && !selected.isConnected) { selected = null; draw() }
        let pick = null
        if (selected) {
          const rect = selected.getBoundingClientRect()
          const styles = getComputedStyle(selected)
          pick = {
            tag: tag(selected), id: selected.id.slice(0, 256),
            classes: (selected.getAttribute('class') ?? '').slice(0, 2048),
            box: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
            styles: Object.fromEntries(properties.map(name => [name, styles.getPropertyValue(name).slice(0, 2048)])),
            path: ancestors().map(element => ({ tag: tag(element), id: element.id.slice(0, 256) }))
          }
        }
        const next = action
        action = null
        return { picking, pick, action: next }
      },
      stop() {
        window.removeEventListener('pointermove', move, true)
        window.removeEventListener('mouseleave', leave, true)
        window.removeEventListener('click', click, true)
        window.removeEventListener('keydown', keydown, true)
        window.removeEventListener('scroll', draw, true)
        window.removeEventListener('resize', draw)
        host.remove()
        cursor.remove()
        delete window[key]
      }
    }
    window[key] = picker
    draw()
  }
  if (command.action === 'stop') { picker?.stop(); picker = null }
  else if (command.action === 'start') picker.start()
  else if (command.action === 'select') picker?.selectIndex(command.index)
  else if (command.action === 'suspend') picker?.stage(true)
  else if (command.action === 'resume') picker?.stage(false)
  return { requestId: command.requestId, url: location.href,
    ...(picker?.read() ?? { picking: false, pick: null, action: null }) }
}
