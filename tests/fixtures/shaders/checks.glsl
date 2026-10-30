precision mediump float;
/** @resolution */
uniform vec2 u_resolution;
/** @label Size
 * @default 32
 * @range 1, 64
 */
uniform float u_size;
/** @label Primary Color
 * @color
 * @default #336699
 */
uniform vec3 u_color;
/** @label Offset
 * @default 0.25, 0.75
 */
uniform vec2 u_offset;
void main() {
  vec2 cell = floor(gl_FragCoord.xy / u_size);
  float check = mod(cell.x + cell.y, 2.0);
  gl_FragColor = vec4(mix(u_color, vec3(1.0), check), 1.0);
}
