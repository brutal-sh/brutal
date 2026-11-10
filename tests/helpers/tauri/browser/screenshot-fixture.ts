import { createServer } from 'node:http'

export async function createNativeScreenshotFixture() {
  const state = { scrolling: 0, lastY: 200, animationPauses: 0 }
  const server = createServer((request, response) => {
    response.setHeader('Access-Control-Allow-Origin', '*')
    if (request.url === '/animation-paused') {
      state.animationPauses++
      response.end('ok')
      return
    }
    if (request.url === '/pause-count') {
      response.end(String(state.animationPauses))
      return
    }
    if (request.url?.startsWith('/scroll?')) {
      state.scrolling++
      state.lastY = Number(new URL(request.url, 'http://fixture.test').searchParams.get('y'))
      response.end('ok')
      return
    }
    if (request.url === '/scroll-count') {
      response.end(String(state.scrolling))
      return
    }
    if (request.url === '/scroll-y') {
      response.end(String(state.lastY))
      return
    }
    response.writeHead(200, { 'Content-Type': 'text/html' })
    // oxlint-disable-next-line open-pencil/no-hand-rolled-color -- Exact native screenshot pixels.
    response.end(
      `<!doctype html><title>Tall capture fixture</title><style>html,body{margin:0}body{height:1800px;background:linear-gradient(to bottom,#112233 0px,#112233 600px,#22aa55 600px,#22aa55 1200px,#3344cc 1200px,#3344cc 1800px)}header{position:fixed;left:0;top:0;height:30px;width:100%;background:#ff0000}</style><header></header><script>const pause=Animation.prototype.pause;Animation.prototype.pause=function(){fetch('/animation-paused');return pause.call(this)};const animator=document.createElement('i');document.body.append(animator);animator.animate([{transform:'translateX(0)'},{transform:'translateX(1px)'}],{duration:1000,iterations:Infinity});scrollTo(0,200);addEventListener('scroll',()=>fetch('/scroll?y='+scrollY));</script>`
    )
  })
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Missing screenshot fixture address')
  const origin = `http://127.0.0.1:${address.port}`
  return { server, origin }
}
