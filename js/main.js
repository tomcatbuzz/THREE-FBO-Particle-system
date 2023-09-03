import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GPUComputationRenderer } from 'three/examples/jsm/misc/GPUComputationRenderer.js';
import GUI from 'lil-gui';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js'

import fragment from './shaders/fragment.glsl';
import vertex from './shaders/vertex.glsl';
import simVertex from './shaders/simVertex.glsl';
import simFragmentPosition from './shaders/simFragment.glsl';
import simFragmentVelocity from './shaders/simFragmentVelocity.glsl';

import texture from '../test.jpg'
import t2 from '../logo.png'
import t3 from '../super.png'
import suzanne from '../suzanne.glb?url'


function lerp(a, b, n) {
  return (1-n) * a + n * b
}

const loadImage = path => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'Anonymous'
    img.src = path 
    img.onload = () => {
      resolve(img)
    }
    img.onerror = e => {
      reject(e)
    }
  })
}

export default class Sketch {
  constructor(options) {
    this.scene = new THREE.Scene();
    this.container = options.dom;
    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(this.width, this.height);
    // sets the dark color of background
    this.renderer.setClearColor(0x222222, 1); 
    // this.renderer.useLegacyLights = false;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.container.appendChild(this.renderer.domElement)

    this.camera = new THREE.PerspectiveCamera(
      70,
      this.width / this.height,
      0.01,
      10
    );

    this.camera.position.z = 1;
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    // this.controls.enableRotate = false
    // this.controls.enableZoom = false
    this.time = 0;
    this.isPlaying = true;

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2()

    // global size of data texture or particles on the grid
    // this.size = 128;
    this.size = 512;
    this.number = this.size * this.size;

    this.setupSettings();

    this.loader = new GLTFLoader()
    this._position = new THREE.Vector3()
    
    Promise.all([this.loader.loadAsync(suzanne)]).then(([model]) => {
      this.suzanne = model.scene.children[0]
      console.log(this.suzanne)
      // this.scene.add(this.suzanne)
      this.suzanne.geometry.rotateX(-Math.PI/2)
      this.suzanne.material = new THREE.MeshNormalMaterial()
      this.sampler = new MeshSurfaceSampler( this.suzanne )
      // .setWeightAttribute( 'color' )
      .build()
      // original images data textures below
      // this.data1 = textures[0]
      // this.data2 = textures[1]
      this.data1 = this.getPointsOnSphere()
      this.data2 = this.getPointsOnSphere()
      // this.getPixelDataFromImage(t2)
      this.mouseEvents();
      this.setupFBO();
      this.initGPGPU();
      this.addObjects();
      this.setupResize();
      this.render();
      console.log(this.data1, "IMG")
    })
  }

  setupSettings() {
    this.settings = {
      progress: 0
    }
    this.gui = new GUI();
    this.gui.add(this.settings, 'progress', 0, 1, 0.01).onChange(val => {
      this.simMaterial.uniforms.uProgress.value = val
    })
  }

  setupResize() {
    window.addEventListener('resize', this.resize.bind(this));
  }

  resize() {
    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;
    this.renderer.setSize(this.width, this.height);
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
  }

  getVelocityOnSphere() {
    const data = new Float32Array( 4 * this.number)
    for ( let i = 0; i < this.size; i++ ) {
      for ( let j = 0; j < this.size; j++) {
        const index = i * this.size + j;
        
        // generate points on a sphere
        let theta = Math.random() * Math.PI * 2;
        let phi = Math.acos(Math.random() * 2 - 1);
        let x = Math.sin(phi) * Math.cos(theta);
        let y = Math.sin(phi) * Math.sin(theta);
        let z = Math.cos(phi);

        data[ 4 * index ] = 0;
        data[ 4 * index + 1 ] = 0;
        data[ 4 * index + 2 ] = 0;
        data[ 4 * index + 3 ] = 0;
      }
    }
    let dataTexture = new THREE.DataTexture( data, this.size, this.size, THREE.RGBAFormat, THREE.FloatType );
    dataTexture.needsUpdate = true;
    return dataTexture
  }

  // new 3D image data
  getPointsOnSphere() {
    const data = new Float32Array( 4 * this.number)
    for ( let i = 0; i < this.size; i++ ) {
      for ( let j = 0; j < this.size; j++) {
        const index = i * this.size + j;
        
        // generate points on a sphere
        let theta = Math.random() * Math.PI * 2;
        let phi = Math.acos(Math.random() * 2 - 1);
        let x = Math.sin(phi) * Math.cos(theta);
        let y = Math.sin(phi) * Math.sin(theta);
        let z = Math.cos(phi);

        data[ 4 * index ] = x;
        data[ 4 * index + 1 ] = y;
        data[ 4 * index + 2 ] = z;
        data[ 4 * index + 3 ] = (Math.random()-0.5)*0.01;
      }
    }
    let dataTexture = new THREE.DataTexture( data, this.size, this.size, THREE.RGBAFormat, THREE.FloatType );
    dataTexture.needsUpdate = true;
    return dataTexture
  }

  getPointsOnSuzanne() {
    const data = new Float32Array( 4 * this.number)
    for ( let i = 0; i < this.size; i++ ) {
      for ( let j = 0; j < this.size; j++) {
        const index = i * this.size + j;
        
        // generate points on a model
        this.sampler.sample( this._position )

        data[ 4 * index ] = this._position.x;
        data[ 4 * index + 1 ] = this._position.y;
        data[ 4 * index + 2 ] = this._position.z;
        data[ 4 * index + 3 ] = (Math.random()-0.5)*0.01;
      }
    }
    let dataTexture = new THREE.DataTexture( data, this.size, this.size, THREE.RGBAFormat, THREE.FloatType );
    dataTexture.needsUpdate = true;
    return dataTexture
  }

  // original 2D image data
  async getPixelDataFromImage(url) {
    let img = await loadImage(url)
    let width = 200
    
    // console.log(img, 'img')
    let canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = width
    let ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0, width, width)
    let canvasData = ctx.getImageData(0, 0, width, width).data

    let pixels = []
    for (let i = 0; i < canvasData.length; i += 4) {
      let x = (i / 4) % width
      let y = Math.floor((i /4) / width)
      if(canvasData[i] < 5) {
        pixels.push({ x: x/width - 0.5, y: 0.5 - y/width })
      }
    }

    console.log(pixels)
    
    const data = new Float32Array( 4 * this.number)
    for ( let i = 0; i < this.size; i++ ) {
      for ( let j = 0; j < this.size; j++) {
        const index = i * this.size + j;
        let randomPixel = pixels[Math.floor(Math.random() * pixels.length)]
        if(Math.random() > 0.9) {
          randomPixel = { x: 3*(Math.random() - 0.5), y: 3*(Math.random() - 0.5) }
        }
        data[ 4 * index ] = randomPixel.x + (Math.random()-0.5)*0.01;
        data[ 4 * index + 1 ] = randomPixel.y + (Math.random()-0.5)*0.01;
        data[ 4 * index + 2 ] = (Math.random()-0.5)*0.01;
        data[ 4 * index + 3 ] = (Math.random()-0.5)*0.01;
      }
    }
    let dataTexture = new THREE.DataTexture( data, this.size, this.size, THREE.RGBAFormat, THREE.FloatType );
    dataTexture.needsUpdate = true;
    return dataTexture
  }

  mouseEvents() {
    this.raycasterMesh = new THREE.Mesh(
      // use plane geo for 2D
      // new THREE.PlaneGeometry(10, 10),
      // new THREE.SphereGeometry(1, 30, 30),
      this.suzanne.geometry,
      new THREE.MeshBasicMaterial()
    )
    this.dummy = new THREE.Mesh(
      new THREE.SphereGeometry(0.01, 32, 32), 
      new THREE.MeshNormalMaterial()
    )
    this.scene.add(this.dummy)
    window.addEventListener('mousemove', (e) => {
      this.pointer.x = (e.clientX / this.width) * 2 - 1;
      this.pointer.y = -(e.clientY/ this.height) * 2 + 1;
      this.raycaster.setFromCamera(this.pointer, this.camera);

      const intersects = this.raycaster.intersectObjects( [this.raycasterMesh] );
        if (intersects.length > 0) {
          // console.log(intersects[0].point)
          this.dummy.position.copy(intersects[0].point)
          this.simMaterial.uniforms.uMouse.value = intersects[0].point
          // added for gpgpu new functions
          this.positionUniforms.uMouse.value = intersects[0].point
          this.velocityUniforms.uMouse.value = intersects[0].point
        }
    })
  }

  initGPGPU() {
    this.gpuCompute = new GPUComputationRenderer( this.size, this.size, this.renderer );

    if ( this.renderer.capabilities.isWebGL2 === false ) {
      this.gpuCompute.setDataType( THREE.HalfFloatType );
    }

    // this.pointsOnSphere = this.getPointsOnSphere();
    this.velocityOnSphere = this.getVelocityOnSphere();

    // model
    this.pointsOnSphere = this.getPointsOnSuzanne();

    this.positionVariable = this.gpuCompute.addVariable( 'uCurrentPosition', simFragmentPosition, this.pointsOnSphere );
    this.velocityVariable = this.gpuCompute.addVariable( 'uCurrentVelocity', simFragmentVelocity, this.velocityOnSphere );

    this.gpuCompute.setVariableDependencies( this.positionVariable, [ this.positionVariable, this.velocityVariable ] );
    this.gpuCompute.setVariableDependencies( this.velocityVariable, [ this.velocityVariable, this.positionVariable ] );
    
		this.positionUniforms = this.positionVariable.material.uniforms;
    this.velocityUniforms = this.velocityVariable.material.uniforms;

    this.positionUniforms.uTime = { value: 0 };
    this.velocityUniforms.uTime = { value: 0 };
		this.positionUniforms.uMouse = { value: new THREE.Vector3(0, 0, 0) };
    this.velocityUniforms.uMouse = { value: new THREE.Vector3(0, 0, 0) };
    this.positionUniforms.uOriginalPosition = { value: this.pointsOnSphere };
    this.velocityUniforms.uOriginalPosition = { value: this.pointsOnSphere };

    this.gpuCompute.init()
  }

  setupFBO() {
    // moved to top for global 
    // this.size = 32;
    // this.number = this.size * this.size;

    // create data texture
    const data = new Float32Array( 4 * this.number)
    for ( let i = 0; i < this.size; i++ ) {
      for ( let j = 0; j < this.size; j++) {
        const index = i * this.size + j;
        data[ 4 * index ] = lerp(-0.5, 0.5, j / (this.size - 1));
        data[ 4 * index + 1 ] = lerp(-0.5, 0.5, i / (this.size - 1));
        data[ 4 * index + 2 ] = 0;
        data[ 4 * index + 3 ] = 1;
      }
    }
    this.positions = new THREE.DataTexture( data, this.size, this.size, THREE.RGBAFormat, THREE.FloatType );
    this.positions.needsUpdate = true;

    // create FBO scene
    this.sceneFBO = new THREE.Scene();
    this.cameraFBO = new THREE.OrthographicCamera(-1, 1, 1, -1, -2, 2);
    this.cameraFBO.position.z = 1;
    this.cameraFBO.lookAt(new THREE.Vector3(0, 0, 0));
    let geo = new THREE.PlaneGeometry(2, 2, 2, 2);
    this.simMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      wireframe: true
    });
    this.simMaterial = new THREE.ShaderMaterial({
      extensions: {
        derivatives: "#extension GL_OES_standard_derivatives : enable"
      },
      // side: THREE.DoubleSide,
      uniforms: {
        time: { value: 0 },
        progress: { value: 0 },
        texture1: { value: null },
        // test texture
        // t1: { value: new THREE.TextureLoader().load(texture) },
        // t1: { value: this.positions },
        uMouse: { value: new THREE.Vector3(0, 0, 0) },
        uTime: { value: 0 },
        uProgress: { value: 0 },
        // original code before adding getPixeldata images
        // uCurrentPosition: { value: this.positions },
        // uOriginalPosition: { value: this.positions },
        uCurrentPosition: { value: this.data1 },
        uOriginalPosition: { value: this.data1 },
        // add second data texture
        uOriginalPosition1: { value: this.data2 },
        resolution: { value: new THREE.Vector4() },
        uvRate1: { value: new THREE.Vector2(1, 1) },
      },
      // wireframe: true,
      // transparent: true,
      vertexShader: simVertex,
      fragmentShader: simFragmentPosition
    });
    this.simMesh = new THREE.Mesh(geo, this.simMaterial);
    this.sceneFBO.add(this.simMesh);

    this.renderTarget = new THREE.WebGLRenderTarget(this.size, this.size, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType
    })

    this.renderTarget1 = new THREE.WebGLRenderTarget(this.size, this.size, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType
    })
  }

  addObjects() {
    // original -> moved to top as global
    // this.size = 32;
    // this.number = this.size * this.size;

    this.geometry = new THREE.BufferGeometry();
    const positions = new Float32Array( this.number * 3 );
    const uvs = new Float32Array( this.number * 2 );
    for ( let i = 0; i < this.size; i++ ) {
      for ( let j = 0; j < this.size; j++) {
        const index = i * this.size + j;
        positions[ 3 * index ] = ( j / this.size ) - 0.5;
        positions[ 3 * index + 1 ] = ( i / this.size ) - 0.5;
        positions[ 3 * index + 2 ] = 0;
        uvs[ 2 * index ] = j / (this.size-1);
        uvs[ 2 * index + 3 ] = i / (this.size-1);
      }
    }
    this.geometry.setAttribute( 'position', new THREE.BufferAttribute( positions, 3));
    this.geometry.setAttribute( 'uv', new THREE.BufferAttribute( uvs, 2));

    // original -> moved to FBO scene
    // const data = new Float32Array( 4 * this.number)
    // for ( let i = 0; i < this.size; i++ ) {
    //   for ( let j = 0; j < this.size; j++) {
    //     const index = i * this.size + j;
    //     data[ 4 * index ] = Math.random()*2-1;
    //     data[ 4 * index + 1 ] = Math.random()*2-1;
    //     data[ 4 * index + 2 ] = 0;
    //     data[ 4 * index + 3 ] = 1;
    //   }
    // }
    // this.positions = new THREE.DataTexture( data, this.size, this.size, THREE.RGBAFormat, THREE.FloatType );
    // this.positions.needsUpdate = true;

    this.material = new THREE.ShaderMaterial({
      extensions: {
        derivatives: "#extension GL_OES_standard_derivatives : enable"
      },
      // side: THREE.DoubleSide,
      uniforms: {
        time: { value: 0 },
        progress: { value: 0 },
        texture1: { value: null },
        // test texture
        // t1: { value: new THREE.TextureLoader().load(texture) },
        t1: { value: this.positions },
        resolution: { value: new THREE.Vector4() },
        uvRate1: { value: new THREE.Vector2(1, 1) },
      },
      // wireframe: true,
      // transparent: true,
      vertexShader: vertex,
      fragmentShader: fragment,
      depthWrite: false,
      depthTest: false,
      transparent: true
    });
    

    this.mesh = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.mesh);
  }

  stop() {
    this.isPlaying = false;
  }

  play() {
    if (!this.isPlaying) {
      this.render()
      this.isPlaying = true;
    }
  }

  render() {
    if (!this.isPlaying) return;
    this.time += 0.05;
    this.material.uniforms.time.value = this.time;
    // this.mesh.position.x += 0.001;
    // this.material.uniforms.progress.value = this.settings.progress;
    // this.mesh.rotation.x = this.time / 20;
    // this.mesh.rotation.y = this.time / 10;

    // code before adding gpgpu functions
    // this.renderer.setRenderTarget(this.renderTarget);    
    // this.renderer.render(this.sceneFBO, this.cameraFBO);

    // this.renderer.setRenderTarget(null);
    this.gpuCompute.compute()
    this.renderer.render(this.scene, this.camera);

    // swap renderTargets code before adding gpgpu functions
    // const tmp = this.renderTarget;
    // this.renderTarget = this.renderTarget1;
    // this.renderTarget1 = tmp;

    this.material.uniforms.t1.value = this.gpuCompute.getCurrentRenderTarget( this.positionVariable ).texture;
    this.positionUniforms.uTime.value = this.time;


    
    // originl set and swap renderTargets run before adding gpgpu functions
    // this.material.uniforms.t1.value = this.renderTarget.texture;
    // this.simMaterial.uniforms.uCurrentPosition.value = this.renderTarget1.texture
    // this.simMaterial.uniforms.uTime.value = this.time

    requestAnimationFrame(this.render.bind(this));
  }
}

new Sketch({
  dom: document.getElementById('container')
})