uniform float time;
varying vec2 vUv;
uniform sampler2D t1;
uniform vec2 pixels;
float PI = 3.141592653589793238;
void main() {
  vUv = uv;
  vec3 newpos = position;
  vec4 color = texture2D( t1, vUv);
  newpos.xy = color.xy;
  // newpos.x += 1.;
  // newpos.x += 0.25;
  // newpos.z += sin( time + position.x*10. ) * 0.5;
  vec4 mvPosition = modelViewMatrix * vec4( newpos, 1.0 );
  // below is the particle size
  gl_PointSize = ( 2.0 / -mvPosition.z );
  gl_Position = projectionMatrix * mvPosition;
}