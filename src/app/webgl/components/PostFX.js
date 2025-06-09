import {
    DepthTexture,
    DepthFormat,
    HalfFloatType,
    RGBAFormat,
    ShaderMaterial,
    WebGLRenderTarget,
    UnsignedShortType,
    Vector2,
    NearestFilter,
    FloatType,
  } from 'three';
  import { EffectComposer, EffectPass, RenderPass, ShaderPass } from 'postprocessing'
    
  import Stage from '@/js/webgl/components/Scene';
  import Camera from '@/js/webgl/components/Camera';
  import Renderer from '@/js/webgl/components/Renderer';
  import vertexShader from '@/js/webgl/shaders/postfx.vs.glsl';
  import fragmentShader from '@/js/webgl/shaders/postfx.fs.glsl';
  import { postFxFolder } from '@/js/utils/debugger';
  import store from '@/js/store/globalStore'
  import fluidTrail from '@/js/webgl/utils/fbo/fluidTrail'
  import GradientEffect from '../postfx/GradientEffect';
  
  const PARAMS = {
    visibility: 0,
  
    saturation: 1.0,
    contrast: 1.0,
    brightness: 0,
  
    bloomActive: true,
    bloomStrength: 0.82,
    bloomRadius: .46,
    bloomThreshold: 0.59,
    bloomSmoothing: 0.05,
    
    chromaticActive: false,
    chromaticOffset: {
      x: 0.002,
      y: 0.002
    },
    chromaticModulation: .15,
    chromaticRadial: true,
  
    gradientActive: false,
    gradientIntensity: 1,
    gradientSamplingLow: 0.16,
    gradientSamplingHigh: 0.15,
    gradientContrast: 0.60,
    gradientBrightness: 0,
    gradientSaturation: 0.83,
  }
  class PostFX {
    constructor() {
      this.composer = null
  
      this.setupDepthRT()
  
      this.shaderMaterial = new ShaderMaterial({
        fragmentShader,
        vertexShader,
        uniforms: {
          tDiffuse: { value: null },
          uResolution: { value: new Vector2() },
          uTime: { value: 0 },
  
          uSaturation: { value: PARAMS.saturation },
          uContrast: { value: PARAMS.contrast },
          uBrightness: { value: PARAMS.brightness },
          tTrail: { value: fluidTrail.fbo.tex.value }
        }
      })
    }
  
    setupDepthRT() {
      const rtParams = {
        minFilter: NearestFilter,
        magFilter: NearestFilter,
        format: RGBAFormat,
        type: HalfFloatType,
        depthBuffer: true,
        stencilBuffer: false,
        generateMipmaps: false
      }
      this.rtDepth = new WebGLRenderTarget(window.innerWidth, window.innerHeight, rtParams)
      this.rtDepth.generateMipmaps = false
      this.rtDepth.depthTexture = new DepthTexture(window.innerWidth, window.innerHeight)
      this.rtDepth.depthTexture.format = DepthFormat
      this.rtDepth.depthTexture.type = UnsignedShortType
    }
  
    init() {
      const { width, height, dpr } = store.viewport
      this.composer = new EffectComposer(renderer, {
        frameBufferType: FloatType,
        multisampling: 4
      })
  
      this.composer.setSize(width, height)
      this.renderPass = new RenderPass(Stage, Camera)
  
      // this.bloomEffect = new BloomEffect({
      //   mipmapBlur: true,
      //   radius: PARAMS.bloomRadius,
      //   luminanceThreshold: PARAMS.bloomThreshold,
      //   luminanceSmoothing: PARAMS.bloomSmoothing,
      //   intensity: PARAMS.bloomStrength
      // })
  
      // this.SMAAEffect = new SMAAEffect()
  
      // this.toneEffect = new ToneMappingEffect({
      //   blendFunction: BlendFunction['DST'],
      //   mode: ToneMappingMode['OPTIMIZED_CINEON']
      // })
  
      this.gradientEffect = new GradientEffect()
      this.effectPass = new EffectPass(Camera, this.gradientEffect)
      this.effectPass.encodeOutput = false
      this.finalPass = new ShaderPass(this.shaderMaterial, 'tDiffuse')
  
      this.composer.removeAllPasses()
      
      this.composer.addPass(this.renderPass)
      this.composer.addPass(this.effectPass)
      this.composer.addPass(this.finalPass)
  
      const lastPass = this.composer.passes[this.composer.passes.length - 1]
      lastPass.renderToScreen = true
  
      this.addDebug()
    }
  
    addDebug() {
      const effectsFolder = postFxFolder.addFolder({ title: 'Effects' })
  
      effectsFolder.addBinding(PARAMS, 'saturation', { min: 0, max: 2 }).on('change', (ev) => { this.shaderMaterial.uniforms.uSaturation.value = ev.value })
      effectsFolder.addBinding(PARAMS, 'contrast', { min: 0, max: 2 }).on('change', (ev) => { this.shaderMaterial.uniforms.uContrast.value = ev.value })
      effectsFolder.addBinding(PARAMS, 'brightness', { min: 0, max: 1 }).on('change', (ev) => { this.shaderMaterial.uniforms.uBrightness.value = ev.value })
  
      if(this.bloomPass) {
        const bloomFolder = effectsFolder.addFolder({ title: 'Bloom' })
        bloomFolder.expanded = false
        bloomFolder.addBinding(PARAMS, 'bloomActive').on('change', (ev) => { this.bloomPass.enabled = ev.value })
        bloomFolder.addBinding(PARAMS, 'bloomStrength', { min: 0, max: 3 }).on('change', (ev) => { this.bloomEffect.intensity = ev.value })
        bloomFolder.addBinding(PARAMS, 'bloomRadius', { min: 0, max: 3 }).on('change', (ev) => { this.bloomEffect.mipmapBlurPass.radius = ev.value })
        bloomFolder.addBinding(PARAMS, 'bloomThreshold', { min: 0, max: 1 }).on('change', (ev) => { this.bloomEffect.luminanceMaterial.threshold = ev.value })
        bloomFolder.addBinding(PARAMS, 'bloomSmoothing', { min: 0, max: 1 }).on('change', (ev) => { this.bloomEffect.luminanceMaterial.smoothing = ev.value })
      }
      
      if(this.chromaticPass) {
        const chromaticFolder = effectsFolder.addFolder({ title: 'Chromatic' })
        chromaticFolder.expanded = false
        chromaticFolder.addBinding(PARAMS, 'chromaticActive').on('change', (ev) => { this.chromaticPass.enabled = ev.value })
        chromaticFolder.addBinding(PARAMS, 'chromaticOffset', {min: 0, max: 0.05, step: 0.001}).on('change', (ev) => {
          this.chromaticEffect.offset.x = ev.value.x
          this.chromaticEffect.offset.y = ev.value.y
        })
        chromaticFolder.addBinding(PARAMS, 'chromaticRadial').on('change', (ev) => { this.chromaticEffect.radialModulation = ev.value })
        chromaticFolder.addBinding(PARAMS, 'chromaticModulation', { min: 0, max: 1 }).on('change', (ev) => { this.chromaticEffect.modulationOffset = ev.value })
      }
  
      if(this.gradientEffect) {
        const gradientFolder = effectsFolder.addFolder({ title: 'Gradient Pass' })
        gradientFolder.expanded = true
        gradientFolder.addBinding(PARAMS, 'gradientActive').on('change', (ev) => { this.gradientPass.enabled = ev.value })
        gradientFolder.addBinding(PARAMS, 'gradientIntensity', { min: 0, max: 1 }).on('change', (ev) => { this.gradientEffect.uniforms.get('intensity').value = ev.value })
        gradientFolder.addBinding(PARAMS, 'gradientSamplingLow', { min: 0, max: 1 }).on('change', (ev) => { this.gradientEffect.uniforms.get('uSamplingLow').value = ev.value })
        gradientFolder.addBinding(PARAMS, 'gradientSamplingHigh', { min: 0, max: 1 }).on('change', (ev) => { this.gradientEffect.uniforms.get('uSamplingHigh').value = ev.value })
        gradientFolder.addBinding(PARAMS, 'gradientContrast', { min: 0, max: 2 }).on('change', (ev) => { this.gradientEffect.uniforms.get('uContrast').value = ev.value })
        gradientFolder.addBinding(PARAMS, 'gradientBrightness', { min: 0, max: 1 }).on('change', (ev) => { this.gradientEffect.uniforms.get('uBrightness').value = ev.value })
        gradientFolder.addBinding(PARAMS, 'gradientSaturation', { min: 0, max: 2 }).on('change', (ev) => { this.gradientEffect.uniforms.get('uSaturation').value = ev.value })
      }
    }
  
    // renderDepthScene() {
    //   // render depth
    //   scene.fogBall.mesh.visible = false
    //   // scene.grass.mesh.visible = false
    //   renderer.setRenderTarget(this.rtDepth)
    //   renderer.clear()
    //   renderer.render(scene, camera);
      
    //   scene.fogBall.update(this.rtDepth.depthTexture)
      
    //   renderer.setRenderTarget(null)
    //   scene.fogBall.mesh.visible = true
    //   // scene.grass.mesh.visible = true
    //   // end render depth
    // }
  
    onResize() {
      const { width, height } = store.viewport
      
      this.shaderMaterial.uniforms.uResolution.value.set(width, height)
      
      this.composer.setSize(width, height)
    }
  
    render(time) {
      this.shaderMaterial.uniforms.uTime.value = time
  
      // this.renderDepthScene()
  
  
      this.composer.render()
  
  
    }
  }
  
  // eslint-disable-next-line import/no-anonymous-default-export
  export default new PostFX();