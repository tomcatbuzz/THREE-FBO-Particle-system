varying vec2 vUv;
uniform sampler2D t1;
uniform sampler2D uMatcap;
varying vec3 vNormal;
varying vec3 vViewPosition;

// varying vec3 vPosition;
float PI = 3.141592653589793238;
void main()	{
  vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, vNormal ), dot( y, vNormal ) ) * 0.495 + 0.5; // 0.495 to remove artifacts caused by undersized matcap disks
  
	vec4 matcapcolor = texture2D( uMatcap, uv );

	vec4 color = texture2D( t1, vUv );
	// below is colored particles
	// gl_FragColor = vec4(vUv,0.0,1.);

	// below sets particles to black
	// gl_FragColor = vec4(0.,0.,0.,1.);

	// below sets particles to white
	gl_FragColor = vec4(vNormal, 1.);
	gl_FragColor = matcapcolor;
	// gl_FragColor = color;
}