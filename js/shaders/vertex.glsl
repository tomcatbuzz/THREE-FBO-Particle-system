uniform float time;
varying vec2 vUv;
uniform sampler2D t1;
uniform vec2 pixels;
float PI = 3.141592653589793238;
void main() {
  vUv = uv;
  vec3 newpos = position;
  vec4 color = texture2D( t1, vUv);
  // original 2D render
  // newpos.xy = color.xy;

  // 3D position
  newpos.xyz = color.xyz;

  // newpos.x += 1.;
  // newpos.x += 0.25;
  // newpos.z += sin( time + position.x*10. ) * 0.5;
  vec4 mvPosition = modelViewMatrix * vec4( newpos, 1.0 );
  // below is the particle size
  gl_PointSize = ( 2.0 / -mvPosition.z );
  gl_Position = projectionMatrix * mvPosition;
}