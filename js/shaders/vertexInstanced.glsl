uniform float time;
varying vec2 vUv;
uniform sampler2D t1;
uniform sampler2D uVelocity;
attribute vec2 uvRef;
varying vec3 vNormal;
varying vec3 vViewPosition;

vec3 rotate3D(vec3 v, vec3 vel) {
  vec3 newpos = v;
  vec3 up = vec3(0, 1, 0);
  vec3 axis = normalize(cross(up, vel));
  float angle = acos(dot(up, normalize(vel)));
  newpos = newpos * cos(angle) + cross(axis, newpos) * sin(angle) + axis * dot(axis, newpos) * (1. - cos(angle));
  return newpos;
}

float PI = 3.141592653589793238;
void main() {
  vUv = uv;
  
  vec4 color = texture2D( t1, uvRef);
  vec4 vel = texture2D(uVelocity, uvRef);
  vec3 newpos = color.xyz;

  vec3 transformed = position.xyz;
  if(length(vel.xyz) < 0.0001) {
    vel.xyz = vec3(0, 0.0001, 0.0001);
  }
  transformed.y *= max(1., length(vel.xyz*1000.));
  transformed = rotate3D(transformed, vel.xyz);
  vNormal = rotate3D(normal, vel.xyz);

  // newpos.x += 1.;
  // newpos.x += 0.25;
  // newpos.z += sin( time + position.x*10. ) * 0.5;

  mat4 instanceMat = instanceMatrix;

  instanceMat[3].x = newpos.x;
  instanceMat[3].y = newpos.y;
  instanceMat[3].z = newpos.z;

  vec4 mvPosition = modelViewMatrix * instanceMat * vec4( transformed, 1.0 );
  vViewPosition = - mvPosition.xyz;
  
  gl_Position = projectionMatrix * mvPosition;
}