// Fixed native operation. Never accepts page script, selectors, network requests or credentials.
function extractPage(requestId) {
  const diagnostics = []
  const nodes = []
  let textLength = 0
  let imageLength = 0
  const properties = [
    'background-color', 'border-top-color', 'border-right-color', 'border-bottom-color',
    'border-left-color', 'border-top-width', 'border-right-width', 'border-bottom-width',
    'border-left-width', 'border-top-style', 'border-right-style', 'border-bottom-style',
    'border-left-style', 'border-top-left-radius', 'border-top-right-radius',
    'border-bottom-left-radius', 'border-bottom-right-radius', 'box-shadow', 'opacity',
    'overflow', 'color', 'font-family', 'font-size', 'font-weight', 'font-style',
    'line-height', 'letter-spacing', 'text-decoration-line', 'text-shadow',
    'text-align', 'text-transform', 'white-space'
  ]
  const unsupported = new Set(['svg', 'canvas', 'video', 'audio', 'iframe', 'object', 'embed',
    'input', 'textarea', 'select', 'math'])
  const ignored = new Set(['script', 'style', 'link', 'meta', 'head', 'template', 'noscript'])
  const issue = (path, message) => {
    if (diagnostics.length < 100) diagnostics.push({ path, message })
  }
  const boxOf = (rect) => ({ x: rect.x + scrollX, y: rect.y + scrollY,
    width: rect.width, height: rect.height })
  const styleOf = (style) => Object.fromEntries(properties.map((key) => [key, style.getPropertyValue(key)]))
  function add(node) {
    if (nodes.length >= 5000) throw new Error('This page exceeds the 5000-node import limit.')
    nodes.push(node)
  }
  function imageBytes(element, style, path, box) {
    if (!element.complete || !element.naturalWidth || !element.naturalHeight) {
      issue(path, 'The image is not loaded. Wait for loading and import again.')
      return undefined
    }
    if (['top', 'right', 'bottom', 'left'].some((side) =>
      parseFloat(style.getPropertyValue(`padding-${side}`)) > 0 ||
      parseFloat(style.getPropertyValue(`border-${side}-width`)) > 0)) {
      issue(path, 'Images with padding or borders are not supported by editable import yet.')
      return undefined
    }
    if (style.objectPosition !== '50% 50%') {
      issue(path, 'This image uses an unsupported object position.')
      return undefined
    }
    const width = Math.ceil(box.width * devicePixelRatio)
    const height = Math.ceil(box.height * devicePixelRatio)
    if (width > 4096 || height > 4096 || width * height > 4000000) {
      issue(path, 'The rendered image exceeds the import pixel limit.')
      return undefined
    }
    try {
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const context = canvas.getContext('2d')
      if (!context) throw new Error('No image encoder')
      const naturalWidth = element.naturalWidth
      const naturalHeight = element.naturalHeight
      const fit = style.objectFit
      let drawWidth = width
      let drawHeight = height
      if (fit !== 'fill') {
        let scale = fit === 'cover' ? Math.max(width / naturalWidth, height / naturalHeight)
          : Math.min(width / naturalWidth, height / naturalHeight)
        if (fit === 'none') scale = devicePixelRatio
        if (fit === 'scale-down') scale = Math.min(devicePixelRatio, scale)
        drawWidth = naturalWidth * scale
        drawHeight = naturalHeight * scale
      }
      context.drawImage(element, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight)
      const png = canvas.toDataURL('image/png')
      imageLength += png.length
      if (png.length > 3 * 1024 * 1024 || imageLength > 10 * 1024 * 1024)
        throw new Error('Image size limit')
      return png
    } catch {
      issue(path, 'Image pixels are unavailable or too large (including cross-origin images without CORS).')
      return undefined
    }
  }
  function walk(node, parentId, path, depth) {
    if (depth > 64) throw new Error('This page exceeds the 64-level import depth limit.')
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? ''
      if (!text.trim()) return
      const parent = node.parentElement
      if (!parent) return
      const range = document.createRange()
      range.selectNodeContents(node)
      const rect = range.getBoundingClientRect()
      if (!rect.width || !rect.height) return
      textLength += text.length
      if (textLength > 256000) throw new Error('This page contains too much text to import.')
      add({ id: `node-${nodes.length}`, parentId, type: 'text', path, tag: 'text', text,
        // Range bounds end exactly at glyph ink. A fractional edge can make Skia rewrap
        // the final glyph; retain the CSS line's available width, rounded outwards.
        box: { ...boxOf(rect), width: Math.max(Math.ceil(rect.width) + 1,
          Math.ceil(parent.getBoundingClientRect().right - rect.left -
            parseFloat(getComputedStyle(parent).paddingRight || '0') -
            parseFloat(getComputedStyle(parent).borderRightWidth || '0'))) },
        style: styleOf(getComputedStyle(parent)) })
      return
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return
    const tag = node.tagName.toLowerCase()
    if (ignored.has(tag)) return
    const style = getComputedStyle(node)
    if (style.display === 'none' || Number(style.opacity) === 0) return
    if (style.visibility !== 'visible') {
      Array.from(node.children).forEach((child, index) => walk(child, parentId,
        `${path}/${child.tagName.toLowerCase()}[${index}]`, depth + 1))
      return
    }
    const rect = node.getBoundingClientRect()
    if (unsupported.has(tag) || node.shadowRoot || tag.includes('-')) {
      if (rect.width && rect.height) issue(path, `Unsupported visible content: ${tag}.`)
      return
    }
    for (const property of ['transform', 'filter', 'backdrop-filter', 'clip-path', 'mask-image',
      '-webkit-mask-image', 'background-image', 'border-image-source', 'perspective']) {
      const value = style.getPropertyValue(property)
      if (value && value !== 'none') issue(path, `Unsupported ${property}: ${value.slice(0, 100)}.`)
    }
    if (style.mixBlendMode !== 'normal' || style.writingMode !== 'horizontal-tb' ||
      (style.zIndex !== 'auto' && style.zIndex !== '0')) issue(path, 'Unsupported blending, writing mode or stacking order.')
    const borders = ['top', 'right', 'bottom', 'left'].filter((side) => parseFloat(style.getPropertyValue(`border-${side}-width`)) > 0)
    const borderColors = borders.map((side) => style.getPropertyValue(`border-${side}-color`))
    const borderStyles = borders.map((side) => style.getPropertyValue(`border-${side}-style`))
    if (new Set(borderColors).size > 1 || new Set(borderStyles).size > 1 ||
      borderStyles.some((value) => !['solid', 'dashed', 'dotted', 'none'].includes(value)))
      issue(path, 'Mixed border paints or unsupported border styles cannot be preserved yet.')
    if (['top-left', 'top-right', 'bottom-left', 'bottom-right'].some((corner) =>
      /%| /.test(style.getPropertyValue(`border-${corner}-radius`))))
      issue(path, 'Percentage or elliptical corner radii cannot be preserved yet.')
    if (style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0)
      issue(path, 'CSS outlines cannot be preserved yet.')
    if (node.scrollTop || node.scrollLeft || style.overflowX !== style.overflowY)
      issue(path, 'Scrolled or independently clipped containers cannot be preserved yet.')
    if (tag === 'li' && style.listStyleType !== 'none') issue(path, 'Generated list markers are not supported yet.')
    for (const pseudo of ['::before', '::after']) {
      const content = getComputedStyle(node, pseudo).content
      if (content && content !== 'none' && content !== 'normal') issue(path, `Generated ${pseudo} content is not supported yet.`)
    }
    const id = `node-${nodes.length}`
    const box = boxOf(rect)
    // A display:contents node has no box, but its rendered descendants still belong to the page.
    const hasBox = rect.width > 0 && rect.height > 0
    if (hasBox) add({ id, parentId, type: 'element', path, tag, box, style: styleOf(style),
      ...(tag === 'img' ? { image: imageBytes(node, style, path, box) } : {}) })
    if (tag === 'img') return
    Array.from(node.childNodes).forEach((child, index) => walk(child, hasBox ? id : parentId,
      `${path}/${child.nodeType === Node.TEXT_NODE ? 'text()' : child.nodeName.toLowerCase()}[${index}]`, depth + 1))
  }
  try {
    if (document.readyState !== 'complete' || document.fonts.status !== 'loaded' || !document.body) throw new Error('Wait for the page to finish loading.')
    const width = Math.max(innerWidth, document.documentElement.scrollWidth, document.body.scrollWidth)
    const height = Math.max(innerHeight, document.documentElement.scrollHeight, document.body.scrollHeight)
    if (width > 32768 || height > 32768) throw new Error('This page exceeds the 32768-pixel import dimensions.')
    walk(document.body, null, 'body', 0)
    const background = getComputedStyle(document.documentElement).backgroundColor
    return { version: 1, requestId, url: location.href, title: document.title.slice(0, 256),
      width, height, viewportWidth: innerWidth, viewportHeight: innerHeight,
      background: background === 'rgba(0, 0, 0, 0)' ? 'rgb(255, 255, 255)' : background,
      nodes, diagnostics }
  } catch (error) {
    return { requestId, error: error instanceof Error ? error.message : 'Page extraction failed.' }
  }
}
