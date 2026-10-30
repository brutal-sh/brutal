import { tryParseColor } from '@open-pencil/scene-graph/color'
import type { Size } from '@open-pencil/scene-graph/primitives'
import {
  fragmentUniforms,
  type FragmentShader,
  type FragmentUniform,
  type ShaderUniformValue
} from '@open-pencil/scene-graph/shaders'

/** A detached WebGL player; GLSL is compiled as graphics, never evaluated as JavaScript. */
export function createFragmentRenderer(shader: FragmentShader, logicalSize?: Size) {
  let gl: WebGLRenderingContext | null = null
  let program: WebGLProgram | null = null
  let buffer: WebGLBuffer | null = null
  let elapsed = 0
  let failure: string | null = null
  const controls = fragmentUniforms(shader.source)

  function compile(context: WebGLRenderingContext, type: number, source: string) {
    const compiled = context.createShader(type)
    if (!compiled) throw new Error('Could not allocate a shader.')
    context.shaderSource(compiled, source)
    context.compileShader(compiled)
    if (!context.getShaderParameter(compiled, context.COMPILE_STATUS)) {
      const message = context.getShaderInfoLog(compiled) || 'Shader compilation failed.'
      context.deleteShader(compiled)
      throw new Error(message)
    }
    return compiled
  }

  function setUniform(control: FragmentUniform, value: ShaderUniformValue) {
    if (!gl || !program) return
    const location = gl.getUniformLocation(program, control.name)
    if (location === null) return
    if (control.type === 'sampler2D')
      throw new Error('Shader texture inputs are not supported yet.')
    let numbers: number[]
    if (control.color && typeof value === 'string') {
      const color = tryParseColor(value)
      if (!color) throw new Error(`Invalid color for shader uniform ${control.name}.`)
      numbers = [color.r, color.g, color.b, color.a].slice(0, control.size)
    } else if (Array.isArray(value)) numbers = value
    else numbers = [typeof value === 'boolean' ? Number(value) : Number(value)]
    if (numbers.length !== control.size || !numbers.every(Number.isFinite))
      throw new Error(`Invalid value for shader uniform ${control.name}.`)
    if (control.integer || control.type === 'bool') {
      const integers = Int32Array.from(numbers)
      if (control.size === 1) gl.uniform1iv(location, integers)
      else if (control.size === 2) gl.uniform2iv(location, integers)
      else if (control.size === 3) gl.uniform3iv(location, integers)
      else gl.uniform4iv(location, integers)
    } else {
      const floats = Float32Array.from(numbers)
      if (control.size === 1) gl.uniform1fv(location, floats)
      else if (control.size === 2) gl.uniform2fv(location, floats)
      else if (control.size === 3) gl.uniform3fv(location, floats)
      else gl.uniform4fv(location, floats)
    }
  }

  function bindUniforms(width: number, height: number) {
    for (const control of controls) {
      if (control.automatic === 'sdf' || control.automatic === 'mouse')
        throw new Error(`Shader @${control.automatic} input is not supported yet.`)
      let value = shader.uniforms[control.name] ?? control.value
      if (control.automatic === 'resolution') value = [width, height]
      if (control.automatic === 'time') value = 0
      setUniform(control, value)
    }
  }

  function dispose() {
    if (!gl) return
    if (buffer) gl.deleteBuffer(buffer)
    if (program) gl.deleteProgram(program)
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    gl = null
    program = null
    buffer = null
  }

  return {
    async initialize(canvas: HTMLCanvasElement) {
      if (!shader.source.trim()) throw new Error('Choose a shader source file.')
      const context = canvas.getContext('webgl', {
        alpha: true,
        premultipliedAlpha: true,
        preserveDrawingBuffer: true,
        antialias: false
      })
      if (!context) throw new Error('WebGL is unavailable.')
      gl = context
      let vertex: WebGLShader | null = null
      let fragment: WebGLShader | null = null
      try {
        vertex = compile(
          context,
          context.VERTEX_SHADER,
          'attribute vec2 position; void main(){gl_Position=vec4(position,0.0,1.0);}'
        )
        const source = shader.source
          .replace(/^\s*#version\s+100[^\n]*(?:\n|$)/m, '')
          .replace(/\bgl_FragCoord\b/g, '_openPenFragCoord()')
        fragment = compile(
          context,
          context.FRAGMENT_SHADER,
          'precision highp float;\nuniform vec2 _openPenScale;\nvec4 _openPenFragCoord(){return vec4(gl_FragCoord.xy/_openPenScale,gl_FragCoord.zw);}\n' +
            source
        )
        program = context.createProgram()
        context.attachShader(program, vertex)
        context.attachShader(program, fragment)
        context.linkProgram(program)
        if (!context.getProgramParameter(program, context.LINK_STATUS))
          throw new Error(context.getProgramInfoLog(program) || 'Shader linking failed.')
        context.useProgram(program)
        buffer = context.createBuffer()
        context.bindBuffer(context.ARRAY_BUFFER, buffer)
        context.bufferData(
          context.ARRAY_BUFFER,
          new Float32Array([-1, -1, 3, -1, -1, 3]),
          context.STATIC_DRAW
        )
        const position = context.getAttribLocation(program, 'position')
        context.enableVertexAttribArray(position)
        context.vertexAttribPointer(position, 2, context.FLOAT, false, 0, 0)
        const width = logicalSize?.width || canvas.width
        const height = logicalSize?.height || canvas.height
        context.uniform2f(
          context.getUniformLocation(program, '_openPenScale'),
          canvas.width / width,
          canvas.height / height
        )
        bindUniforms(width, height)
        context.viewport(0, 0, canvas.width, canvas.height)
      } catch (error) {
        failure = error instanceof Error ? error.message : String(error)
        dispose()
        throw error
      } finally {
        if (vertex) context.deleteShader(vertex)
        if (fragment) context.deleteShader(fragment)
      }
    },
    async renderFrame({ deltaSeconds = 0 }: { deltaSeconds?: number; waitForGpu?: boolean } = {}) {
      if (!gl || !program) return
      elapsed += deltaSeconds
      for (const control of controls) if (control.automatic === 'time') setUniform(control, elapsed)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      gl.flush()
    },
    getFailureReason: () => failure,
    dispose
  }
}
