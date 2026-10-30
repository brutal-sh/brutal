precision mediump float;
/** @time */
uniform float time;
void main() {
  gl_FragColor = vec4(fract(time / 10.0), 0.25, 0.5, 1.0);
}
