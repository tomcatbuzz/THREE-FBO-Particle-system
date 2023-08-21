// varying vec2 vUv;
// uniform sampler2D t1;
uniform float uProgress;
// uniform sampler2D uCurrentPosition;
uniform sampler2D uOriginalPosition;
uniform sampler2D uOriginalPosition1;
uniform vec3 uMouse;
uniform float uTime;
float PI = 3.141592653589793238;
float rand(vec2 co){
    return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}

void main()	{
  vec2 vUv = gl_FragCoord.xy / resolution.xy;
  float offset = rand(vUv);
  // original 2D textures
	// vec2 position = texture2D( uCurrentPosition, vUv ).xy;
  // vec2 original = texture2D( uOriginalPosition, vUv ).xy;
  // vec2 original1 = texture2D( uOriginalPosition1, vUv ).xy;

  // changing to 3D
  vec3 position = texture2D( uCurrentPosition, vUv ).xyz;
  vec3 original = texture2D( uOriginalPosition, vUv ).xyz;
  vec3 original1 = texture2D( uOriginalPosition1, vUv ).xyz;

  // original use of velocity with 2D
  // vec2 velocity = texture2D( uCurrentPosition, vUv ).zw;

  // original 2D mix
  // vec2 finalOriginal = mix(original, original1, uProgress);

  // 3D 
  vec3 finalOriginal = original;

  // can change velocity lower makes particles stop faster
  // for 2D render
  // velocity *= 0.99;

  // particle attraction to shape force 2D
  // vec2 direction = normalize( finalOriginal - position );
  // float dist = length( finalOriginal - position );
  // if(dist > 0.01) {
  //   // can change end value 0.001 for different effect
  //   velocity += direction * 0.0001;
  // }

  // particle attraction to shape force 3D
  vec3 direction = normalize( finalOriginal - position );
  float dist = length( finalOriginal - position );
  if(dist > 0.01) {
    // can change end value 0.001 for different effect
    position += direction * 0.001;
  }

  // mouse repel force 2D
  // float mouseDistance = distance( position, uMouse.xy );
  // float maxDistance = 0.1;
  // if( mouseDistance < maxDistance ) {
  //   vec2 direction = normalize( position - uMouse.xy );
  //   // can change end value 0.001 for different effect
  //   velocity += direction * (1.0 - mouseDistance / maxDistance ) * 0.001;
  // }

  // mouse repel force 3D
  float mouseDistance = distance( position, uMouse );
  float maxDistance = 0.1;
  if( mouseDistance < maxDistance ) {
    vec3 direction = normalize( position - uMouse );
    // can change end value 0.001 for different effect
    position += direction * (1.0 - mouseDistance / maxDistance ) * 0.01;
  }

  // lifespan of particles 2D
  // float lifespan = 20.;
  // float age = mod( uTime + lifespan*offset, lifespan );
  // if( age < 0.1 ) {
  //   velocity = vec2(0.0, 0.001);
  //   position.xy = finalOriginal;
  // }

  // lifespan of particles 3D
  float lifespan = 20.;
  float age = mod( uTime + lifespan*offset, lifespan );
  if( age < 0.1 ) {
    // velocity = vec2(0.0, 0.001);
    position.xyz = finalOriginal;
  }

  // original shader code before adding velocity
  // vec2 force = finalOriginal - uMouse.xy;

  // float len = length(force);
  // float forceFactor = 1./max(1.,len*50.);
  // // vec2 positionToGo = original + normalize(force) * 0.1;
  // vec2 positionToGo = finalOriginal + normalize(force)*forceFactor * 0.3;
  // position.xy += (positionToGo - position.xy) * 0.05;

  // position.xy += velocity;
	
  // position.xy += normalize(position.xy) * 0.001;
  // original before velocity
	// gl_FragColor = vec4( position, 0.0, 1.0 );

  // original data textures 2D with velocity
  // gl_FragColor = vec4( position, velocity);

  // changing to 3D
  gl_FragColor = vec4( position, 1.);
}