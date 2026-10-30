precision mediump float;
/** @resolution */
uniform vec2 resolution;
void main() {
  gl_FragColor = vec4(resolution / 1000.0, 0.0, 1.0);
}
