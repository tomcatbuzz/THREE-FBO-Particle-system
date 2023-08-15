// uniform float time;
// uniform float progress;
uniform sampler2D t1;
// uniform vec4 resolution;
varying vec2 vUv;
// varying vec3 vPosition;
float PI = 3.141592653589793238;
void main()	{
	vec4 color = texture2D( t1, vUv );
	// below is colored particles
	// gl_FragColor = vec4(vUv,0.0,1.);

	// below sets particles to black
	// gl_FragColor = vec4(0.,0.,0.,1.);

	// below sets particles to white
	gl_FragColor = vec4(1.,1.,1.,.3);
	// gl_FragColor = color;
}