import { strict as assert } from 'node:assert'
import { readFile } from 'node:fs/promises'
import { createServer, type Server } from 'node:http'

import { repoPath } from '#tests/helpers/paths'
import { createNativeLayerFixture } from '#tests/helpers/tauri/editor-snapshot'
import { invokeNative } from '#tests/helpers/tauri/invoke'

let server: Server
let origin: string
let instruction = ''
let holdNext = false
let releasePage: (() => void) | undefined

before(async () => {
  const font = await readFile(repoPath('packages/core/assets/InterVariable.ttf'))
  server = createServer((request, response) => {
    response.setHeader('Access-Control-Allow-Origin', '*')
    if (request.url === '/hold-next') {
      holdNext = true
      response.end('held')
      return
    }
    if (request.url === '/release') {
      releasePage?.()
      releasePage = undefined
      response.end('released')
      return
    }
    if (request.url === '/font.ttf') {
      response.end(font)
      return
    }
    if (request.url?.startsWith('/command/')) {
      instruction = request.url.slice('/command/'.length)
      response.end('queued')
      return
    }
    if (request.url === '/next') {
      response.end(instruction)
      instruction = ''
      return
    }
    const finish = () => {
      response.writeHead(200, { 'Content-Type': 'text/html' })
      response.end(`<!doctype html><title>Picker fixture</title><style>
    @font-face{font-family:Inter;src:url('/font.ttf')}body{margin:0;font-family:Inter;background:#fff}section{padding:20px}p{width:200px;height:50px;margin:0;background:#22aa55;color:white}#offscreen{position:absolute;top:1800px;left:20px}#fixed{position:fixed;top:140px;left:280px;width:80px}#fractional{position:absolute;top:500.25px;left:20.25px;width:120.25px;height:1200.25px}body{height:2000px}</style>
    <section id="parent"><p id="first" class="message">Picked paragraph</p><p id="other">Unpicked neighbor</p><input type="password" value="excluded-password"></section><p id="offscreen">Outside the viewport</p><p id="fixed">Fixed card</p><p id="fractional">Fractional tall card</p>
    <script>setInterval(async()=>{try{const command=await(await fetch('/next')).text();if(command.startsWith('pick-'))document.getElementById(command.slice(5))?.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));if(command==='enter')window.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));}catch{}},50)</script>`)
    }
    if (request.url === '/page' && holdNext) {
      holdNext = false
      releasePage = finish
    } else finish()
  })
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Missing picker fixture address')
  origin = `http://127.0.0.1:${address.port}`
  const fixture = await createNativeLayerFixture()
  await browser.execute((id) => window.openPencil?.getStore?.().select([id]), fixture.first)
})

after(async () => {
  await invokeNative('browser_preview_action', { action: 'close' }).catch(() => undefined)
  releasePage?.()
  server.close()
})

it('delivers native picking, selected pixels and editable subtree import without leaking form values', async () => {
  const result = await browser.executeAsync<
    { failure?: string; width?: number; height?: number },
    [string]
  >(async (origin, done) => {
    const invoke = window.__TAURI__?.core.invoke
    const store = window.openPencil?.getStore?.()
    if (!invoke || !store) return done({ failure: 'Missing native editor' })
    const pageId = store.state.currentPageId
    const initial = store.graph.getChildren(pageId).map((node) => node.id)
    const selected = [...store.state.selectedIds]
    const initialVersion = store.state.sceneVersion
    const wait = async (condition: () => boolean | Promise<boolean>, label: string) => {
      const deadline = Date.now() + 20000
      while (Date.now() < deadline) {
        if (await condition()) return
        await new Promise((resolve) => {
          setTimeout(resolve, 30)
        })
      }
      throw new Error(`Timed out: ${label}`)
    }
    const control = (label: string) =>
      document.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)
    const button = (label: string) => {
      const node = control(label)
      if (!node || node.disabled) throw new Error(`Unavailable ${label}`)
      node.click()
    }
    const pick = async (id: string) => {
      await wait(
        () => !!control('Select an element') && !control('Select an element')?.disabled,
        'picker ready'
      )
      button('Select an element')
      await wait(() => !!control('Stop selecting an element'), 'picker active')
      await fetch(`${origin}/command/pick-${id}`)
      await wait(() => !!control('Import the selection as nodes (Enter)'), 'selected element')
    }
    const textIn = (id: string): string[] =>
      store.graph
        .getChildren(id)
        .flatMap((node) => (node.type === 'TEXT' ? [node.text ?? ''] : textIn(node.id)))
    const captureSelection = async () => {
      const png = await invoke<ArrayBuffer>('browser_preview_capture', {
        url: origin + '/page',
        selected: true
      })
      const header = new DataView(png)
      const width = header.getUint32(16),
        height = header.getUint32(20)
      if (width !== 200 * devicePixelRatio || height !== 50 * devicePixelRatio)
        throw new Error(`Wrong selected pixels: ${width}x${height}`)
      const imageURL = URL.createObjectURL(new Blob([png], { type: 'image/png' }))
      try {
        const image = new Image()
        image.src = imageURL
        await image.decode()
        const canvas = document.createElement('canvas')
        canvas.width = image.width
        canvas.height = image.height
        const context = canvas.getContext('2d')
        if (!context) throw new Error('Missing PNG pixel reader')
        context.drawImage(image, 0, 0)
        const pixel = [...context.getImageData(0, 0, 1, 1).data]
        if (pixel.join(',') !== '34,170,85,255')
          throw new Error(`Selected capture contains an overlay or wrong pixels: ${pixel}`)
      } finally {
        URL.revokeObjectURL(imageURL)
      }
      await wait(
        () => !control('Screenshot the selection onto the canvas (Cmd+Enter)')?.disabled,
        'capture ready'
      )
      button('Screenshot the selection onto the canvas (Cmd+Enter)')
      await wait(
        () => store.graph.getChildren(pageId).length === initial.length + 1,
        'captured image layer'
      )
      const image = store.graph.getChildren(pageId).find((node) => !initial.includes(node.id))
      if (image?.width !== 200 || image.height !== 50)
        throw new Error('Selected image does not retain CSS dimensions')
      if (!image?.fills.some((fill) => fill.type === 'IMAGE'))
        throw new Error('Selection capture is not an image')
      await wait(() => !!control('Select an element'), 'capture clears picker')
      return { width, height }
    }
    const importSelection = async () => {
      store.undoAction()
      store.select(selected)
      await pick('first')
      await fetch(origin + '/command/enter')
      await wait(
        () => store.graph.getChildren(pageId).length === initial.length + 1,
        'selected subtree import'
      )
      const imported = store.graph.getChildren(pageId).find((node) => !initial.includes(node.id))
      if (!imported || imported.width !== 200 || imported.height !== 50)
        throw new Error('Wrong subtree dimensions')
      const texts = textIn(imported.id)
      if (texts.join('') !== 'Picked paragraph' || texts.join('').includes('excluded-password'))
        throw new Error('Import includes content outside the selection')
      await wait(() => !!control('Select an element'), 'import clears picker')
      store.undoAction()
      store.select(selected)
    }
    const captureAdditionalSelection = async (id: string, width: number, height: number) => {
      await pick(id)
      await wait(
        () => !control('Screenshot the selection onto the canvas (Cmd+Enter)')?.disabled,
        'selected camera'
      )
      button('Screenshot the selection onto the canvas (Cmd+Enter)')
      await wait(
        () => store.graph.getChildren(pageId).length === initial.length + 1,
        'selected capture'
      )
      const image = store.graph.getChildren(pageId).find((node) => !initial.includes(node.id))
      if (!image || image.width !== width || image.height !== height || image.parentId !== pageId)
        throw new Error(`Wrong ${id} capture dimensions`)
      const slices = image.type === 'FRAME' ? store.graph.getChildren(image.id) : [image]
      if (slices.reduce((sum, slice) => sum + (slice.height ?? 0), 0) !== height)
        throw new Error('Selected slice heights do not join')
      for (const slice of slices) {
        const hash = slice.fills?.find((fill) => fill.type === 'IMAGE')?.imageHash
        const bytes = hash && store.graph.images.get(hash)
        if (
          !bytes ||
          new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(20) < 1
        )
          throw new Error('Selected capture contains an empty pixel slice')
      }
      await wait(() => !!control('Select an element'), 'capture clears picker')
      store.undoAction()
      store.select(selected)
    }
    const reloadSelection = async () => {
      await pick('offscreen')
      let refused = false
      try {
        await invoke('browser_preview_capture', { url: origin + '/page', selected: true })
      } catch {
        refused = true
      }
      if (
        !refused ||
        store.graph
          .getChildren(pageId)
          .map((node) => node.id)
          .join(',') !== initial.join(',')
      )
        throw new Error('Offscreen capture changed the design')
      await fetch(origin + '/hold-next')
      button('Reload')
      await wait(
        async () =>
          (await invoke<{ loading: boolean } | null>('browser_preview_status'))?.loading === true,
        'controlled reload loading'
      )
      await wait(
        () => !document.querySelector('[aria-label="Selected element styles"]'),
        'reload clears selection UI'
      )
      await fetch(origin + '/release')
      await wait(
        async () =>
          (await invoke<{ loading: boolean } | null>('browser_preview_status'))?.loading === false,
        'reloaded page'
      )
      await wait(
        () => !!control('Select an element') && !control('Select an element')?.disabled,
        'reloaded picker ready'
      )
      if (document.body.textContent?.includes('The element selection could not be updated'))
        throw new Error('Reload leaves a false picker error')
      let expiredImport = false
      let expiredCapture = false
      try {
        await invoke('browser_preview_extract', {
          url: origin + '/page',
          requestId: crypto.randomUUID(),
          selected: true
        })
      } catch {
        expiredImport = true
      }
      try {
        await invoke('browser_preview_capture', { url: origin + '/page', selected: true })
      } catch {
        expiredCapture = true
      }
      if (!expiredImport || !expiredCapture)
        throw new Error('Expired selection silently falls back to the full page')
    }
    let result: { failure?: string; width?: number; height?: number } = {}
    let lastGeometry = ''
    let resumeFrames: () => void = () => undefined
    try {
      button('Import Web via Browser')
      await wait(() => {
        const input = document.querySelector<HTMLInputElement>('input[aria-label="Web address"]')
        return !!input && !input.disabled
      }, 'inline address')
      const address = document.querySelector<HTMLInputElement>('input[aria-label="Web address"]')
      if (!address) throw new Error('Missing address')
      address.focus()
      address.select()
      address.value = origin + '/page'
      address.dispatchEvent(new Event('input', { bubbles: true }))
      await new Promise((resolve) => {
        setTimeout(resolve, 30)
      })
      address
        .closest('form')
        ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
      await wait(async () => {
        const status = await invoke<{ url: string; loading: boolean } | null>(
          'browser_preview_status'
        )
        return status?.url === origin + '/page' && !status.loading
      }, 'loaded page')
      const originalFrame = window.requestAnimationFrame
      let frameSeen = false
      originalFrame.call(window, () => {
        frameSeen = true
      })
      await wait(() => frameSeen, 'initial rendered editor')
      window.requestAnimationFrame = () => 0
      resumeFrames = () => {
        window.requestAnimationFrame = originalFrame
        store.requestRender()
      }
      await pick('first')
      await wait(
        () => !!document.querySelector('[aria-label="Selected element styles"]'),
        'style bar'
      )
      const ancestry = '[aria-label="Selected element ancestry"]'
      const crumbs = [...document.querySelectorAll<HTMLButtonElement>(`${ancestry} button`)]
      if (crumbs.map((node) => node.textContent?.trim()).join(',') !== 'body,section,p')
        throw new Error('Wrong selected ancestry')
      const parent = crumbs.find((node) => node.textContent?.trim() === 'section')
      if (!parent || getComputedStyle(parent).textDecorationLine !== 'underline')
        throw new Error('The parent breadcrumb needs a visible link treatment')
      parent.click()
      await wait(
        () =>
          document.querySelector(`${ancestry} [aria-current="location"]`)?.textContent?.trim() ===
          'section',
        'ancestor breadcrumb selected'
      )
      button('Stop selecting an element')
      await pick('first')
      if (
        store.state.sceneVersion !== initialVersion ||
        [...store.state.selectedIds].join(',') !== selected.join(',')
      )
        throw new Error('Picking changes the design')
      await wait(async () => {
        const status = await invoke<{ height: number; y: number } | null>('browser_preview_status')
        const surface = document
          .querySelector('[data-test-id="browser-preview-surface"]')
          ?.getBoundingClientRect()
        const expected = surface
          ? Math.floor(Math.min(surface.height, innerHeight - surface.y, 1200))
          : 0
        lastGeometry = JSON.stringify({
          native: status?.height,
          surface: surface?.toJSON(),
          innerHeight,
          expected
        })
        return (
          !!status && !!surface && status.height === expected && status.y === Math.floor(surface.y)
        )
      }, 'settled native surface')
      resumeFrames()
      const { width, height } = await captureSelection()
      await importSelection()
      await captureAdditionalSelection('fixed', 80, 50)
      await captureAdditionalSelection('fractional', 121, 1201)
      await reloadSelection()
      result = { width, height }
    } catch (reason) {
      result = { failure: `${String(reason)} ${lastGeometry}` }
    } finally {
      resumeFrames()
      control('Close browser preview')?.click()
      await invoke('browser_preview_action', { action: 'close' }).catch(() => undefined)
    }
    done(result)
  }, origin)
  assert.equal(result.failure, undefined, result.failure)
  assert.ok(result.width && result.height)
})
