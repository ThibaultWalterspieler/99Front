import {
  DepthFormat,
  DepthTexture,
  HalfFloatType,
  NearestFilter,
  RGBAFormat,
  ShaderMaterial,
  UnsignedShortType,
  Vector2,
  WebGLRenderTarget,
} from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { ACESFilmicToneMappingShader } from 'three/addons/shaders/ACESFilmicToneMappingShader.js';
import { BrightnessContrastShader } from 'three/addons/shaders/BrightnessContrastShader.js';
import { GammaCorrectionShader } from 'three/addons/shaders/GammaCorrectionShader.js';

import Camera from '@99Stud/webgl/components/Camera';
import Renderer from '@99Stud/webgl/components/Renderer';
import Scene from '@99Stud/webgl/components/Scene';
import { BloomPass } from '@99Stud/webgl/passes/bloomPass';
import WebGLStore from '@99Stud/webgl/store/WebGLStore';

// import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
// import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// import { LUTPass } from 'three/addons/postprocessing/LUTPass.js';
// import { LUTCubeLoader } from 'three/addons/loaders/LUTCubeLoader.js';

const isWebGLDebug = process.env.NEXT_PUBLIC_WEBGL_DEBUG === 'true';

const PARAMS = {
  renderDepth: true,
  smaa: {
    enabled: false,
    quality: 1,
  },
  gtao: {
    enabled: false,
    output: GTAOPass.OUTPUT.Default,
    blendIntensity: 0,
    ao: {
      radius: 0.25,
      distanceExponent: 1,
      thickness: 1,
      scale: 1,
      samples: 16,
      distanceFallOff: 1,
      screenSpaceRadius: false,
    },
    pd: {
      lumaPhi: 10,
      depthPhi: 2,
      normalPhi: 3,
      radius: 4,
      radiusExponent: 1,
      rings: 2,
      samples: 16,
    },
  },
  bloom: {
    enabled: false,
    brightness: 0.3,
    contrast: 0,
    saturation: 0,
    strength: 0.1,
    upRadius: 2,
    downRadius: 3,
    mixFactor: 0.38,
  },
  brightnessContrast: {
    enabled: false,
    brightness: 0,
    contrast: 0,
  },
  toneMapping: {
    enabled: true,
    exposure: 0.5,
  },
  gammaCorrection: {
    enabled: false,
  },
};

class PostProcessing {
  constructor() {
    this.initialized = false;
    this.depthRenderTarget = null;
    this.composer = null;
  }

  async init() {
    if (this.initialized) {
      // eslint-disable-next-line no-console
      console.warn('PostProcessing already initialized');
      return;
    }

    const { width: w, height: h, dpr } = WebGLStore.viewport;

    this.composer = new EffectComposer(Renderer);
    this.composer.enabled = false;
    this.renderPass = new RenderPass(Scene, Camera);
    this.renderPass.clear = true;
    this.renderPass.clearDepth = true;
    this.renderPass.clearColor = true;

    this.outputPass = new OutputPass();

    this.setupSMAA(w, h);
    this.setupGTAO();
    this.setupBloomPass();
    this.setupBrightnessContrast();
    this.setupToneMapping();
    this.setupGammaCorrection();

    // TODO: Extend RenderPass to support Depth rendering and pass it instead of the current RenderPass in the PostFX pipeline
    this.composer.addPass(this.renderPass);
    this.composer.addPass(this.smaaPass);
    this.composer.addPass(this.gtaoPass);
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(this.brightnessContrastPass);
    this.composer.addPass(this.toneMappingPass);
    this.composer.addPass(this.gammaCorrectionPass);
    this.composer.addPass(this.outputPass);

    this.composer.setSize(w, h);
    this.composer.setPixelRatio(dpr);

    this.initialized = true;
  }

  setupDepthRenderTarget(w, h) {
    const rtParams = {
      depthBuffer: true,
      stencilBuffer: true,
      generateMipmaps: false,
      type: HalfFloatType,
      format: RGBAFormat,
      minFilter: NearestFilter,
      magFilter: NearestFilter,
      flipY: false,
    };
    this.depthRenderTarget = new WebGLRenderTarget(w, h, rtParams);
    this.depthRenderTarget.depthTexture = new DepthTexture(w, h);
    this.depthRenderTarget.depthTexture.type = UnsignedShortType;
    this.depthRenderTarget.depthTexture.format = DepthFormat;

    const depthShader = new ShaderMaterial({
      uniforms: {
        tDepth: { value: null },
        cameraNear: { value: Camera.near },
        cameraFar: { value: Camera.far },
        uResolution: { value: new Vector2(w, h) },
      },
      vertexShader: `
        varying vec2 vUv;
        
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDepth;
        uniform float cameraNear;
        uniform float cameraFar;
        uniform vec2 uResolution;
        varying vec2 vUv;

        #include <packing>

        void main() {
          vec2 uv = gl_FragCoord.xy / uResolution;
          float depthSample = texture2D(tDepth, uv).r;
          float depth = perspectiveDepthToViewZ(depthSample, cameraNear, cameraFar);
          gl_FragColor = vec4(vec3(depthSample), 1.0);
        }
      `,
    });

    this.depthRenderPass = new ShaderPass(depthShader);
    this.depthRenderPass.material.uniforms.tDepth.value = this.depthRenderTarget.depthTexture;
    this.depthRenderPass.material.uniforms.tDepth.needsUpdate = true;

    this.updateDepthUniforms();
  }

  updateDepthUniforms() {
    if (this.depthRenderPass) {
      this.depthRenderPass.material.uniforms.cameraNear.value = Camera.near;
      this.depthRenderPass.material.uniforms.cameraFar.value = Camera.far;
    }
  }

  renderDepth(readBuffer) {
    if (!PARAMS.renderDepth) return;

    Renderer.setRenderTarget(readBuffer);
    Renderer.render(Scene, Camera);
    Renderer.setRenderTarget(null);

    Renderer.autoClear = false;
    Renderer.setRenderTarget(readBuffer);
    Renderer.render(Scene, Camera);
  }

  setupSMAA(w, h) {
    this.smaaPass = new SMAAPass(w, h);
    this.smaaPass.enabled = PARAMS.smaa.enabled;

    if (!isWebGLDebug) return;

    this.smaaFolder.addBinding(PARAMS.smaa, 'quality').on('change', (ev) => {
      this.smaaPass.quality = ev.value;
    });
    this.smaaFolder.addBinding(PARAMS.smaa, 'enabled').on('change', (ev) => {
      this.smaaPass.enabled = ev.value;
    });
  }

  setupGTAO() {
    this.gtaoPass = new GTAOPass(Scene, Camera);
    this.gtaoPass.enabled = PARAMS.gtao.enabled;

    if (!isWebGLDebug) return;

    this.gtaoFolder.addBinding(PARAMS.gtao, 'enabled').on('change', (ev) => {
      this.gtaoPass.enabled = ev.value;
    });

    this.gtaoFolder
      .addBinding(PARAMS.gtao, 'output', {
        options: {
          Default: GTAOPass.OUTPUT.Default,
          Diffuse: GTAOPass.OUTPUT.Diffuse,
          'AO Only': GTAOPass.OUTPUT.AO,
          'AO Only + Denoise': GTAOPass.OUTPUT.Denoise,
          Depth: GTAOPass.OUTPUT.Depth,
          Normal: GTAOPass.OUTPUT.Normal,
        },
      })
      .on('change', (ev) => {
        this.gtaoPass.output = ev.value;
      });
    this.gtaoFolder
      .addBinding(PARAMS.gtao, 'blendIntensity', { min: 0, max: 1, step: 0.01 })
      .on('change', (ev) => {
        this.gtaoPass.blendIntensity = ev.value;
      });

    this.gtaoFolder
      .addBinding(PARAMS.gtao.ao, 'samples', { min: 1, max: 64, step: 1 })
      .on('change', () => {
        this.gtaoPass.updateGtaoMaterial(PARAMS.gtao.ao);
      });
    this.gtaoFolder
      .addBinding(PARAMS.gtao.ao, 'radius', { min: 0.0, max: 1.0 })
      .on('change', () => {
        this.gtaoPass.updateGtaoMaterial(PARAMS.gtao.ao);
      });
  }

  setupBrightnessContrast() {
    this.brightnessContrastPass = new ShaderPass(BrightnessContrastShader);
    this.brightnessContrastPass.enabled = PARAMS.brightnessContrast.enabled;

    if (!isWebGLDebug) return;

    this.brightnessContrastFolder
      .addBinding(PARAMS.brightnessContrast, 'enabled')
      .on('change', (ev) => {
        this.brightnessContrastPass.enabled = ev.value;
      });

    this.brightnessContrastFolder
      .addBinding(PARAMS.brightnessContrast, 'brightness', { min: -0.5, max: 0.5, step: 0.01 })
      .on('change', (ev) => {
        this.brightnessContrastPass.material.uniforms.brightness.value = ev.value;
      });
    this.brightnessContrastFolder
      .addBinding(PARAMS.brightnessContrast, 'contrast', { min: 0, max: 0.5, step: 0.01 })
      .on('change', (ev) => {
        this.brightnessContrastPass.material.uniforms.contrast.value = ev.value;
      });
  }

  setupToneMapping() {
    this.toneMappingPass = new ShaderPass(ACESFilmicToneMappingShader);
    this.toneMappingPass.enabled = PARAMS.toneMapping.enabled;

    if (!isWebGLDebug) return;

    this.toneMappingFolder.addBinding(PARAMS.toneMapping, 'enabled').on('change', (ev) => {
      this.toneMappingPass.enabled = ev.value;
    });

    this.toneMappingFolder
      .addBinding(PARAMS.toneMapping, 'exposure', { min: 0, max: 10, step: 0.01 })
      .on('change', (ev) => {
        this.toneMappingPass.material.uniforms.exposure.value = ev.value;
      });
  }

  setupGammaCorrection() {
    this.gammaCorrectionPass = new ShaderPass(GammaCorrectionShader);
    this.gammaCorrectionPass.enabled = PARAMS.gammaCorrection.enabled;

    if (!isWebGLDebug) return;

    this.gammaCorrectionFolder.addBinding(PARAMS.gammaCorrection, 'enabled').on('change', (ev) => {
      this.gammaCorrectionPass.enabled = ev.value;
    });
  }

  setupBloomPass() {
    this.bloomPass = new BloomPass();
    this.bloomPass.enabled = PARAMS.bloom.enabled;

    if (!isWebGLDebug) return;

    this.bloomFolder.addBinding(PARAMS.bloom, 'enabled').on('change', (ev) => {
      this.bloomPass.enabled = ev.value;
    });

    this.bloomFolder
      .addBinding(PARAMS.bloom, 'brightness', { min: 0, max: 2, step: 0.01 })
      .on('change', (ev) => {
        this.bloomPass.Settings.render.brightness = ev.value;
      });
    this.bloomFolder
      .addBinding(PARAMS.bloom, 'contrast', { min: 0, max: 2, step: 0.01 })
      .on('change', (ev) => {
        this.bloomPass.Settings.render.contrast = ev.value;
      });
    this.bloomFolder
      .addBinding(PARAMS.bloom, 'saturation', { min: 0, max: 2, step: 0.01 })
      .on('change', (ev) => {
        this.bloomPass.Settings.render.saturation = ev.value;
      });

    this.bloomFolder
      .addBinding(PARAMS.bloom, 'strength', { min: 0, max: 2, step: 0.01 })
      .on('change', (ev) => {
        this.bloomPass.Settings.composite.strength = ev.value;
      });
    this.bloomFolder
      .addBinding(PARAMS.bloom, 'mixFactor', { min: 0, max: 1, step: 0.01 })
      .on('change', (ev) => {
        this.bloomPass.Settings.composite.mixFactor = ev.value;
      });

    this.bloomFolder
      .addBinding(PARAMS.bloom, 'upRadius', { min: 0, max: 10, step: 0.01 })
      .on('change', (ev) => {
        this.bloomPass.Settings.render.upRadius = ev.value;
      });

    this.bloomFolder
      .addBinding(PARAMS.bloom, 'downRadius', { min: 0, max: 10, step: 0.01 })
      .on('change', (ev) => {
        this.bloomPass.Settings.render.downRadius = ev.value;
      });
  }

  onResize() {
    const { width, height, dpr } = WebGLStore.viewport;
    this.composer.setSize(width, height);
    this.composer.setPixelRatio(dpr);

    // Resize depth render target if it exists
    if (this.depthRenderTarget) {
      this.depthRenderTarget.setSize(width, height);
      this.depthRenderTarget.depthTexture.image.width = width;
      this.depthRenderTarget.depthTexture.image.height = height;
    }
  }

  render() {
    // Only render separate depth pass if debugging
    if (PARAMS.renderDepth) {
      this.renderDepth();
    }

    this.composer.render();
  }
}

// eslint-disable-next-line import/no-anonymous-default-export
export default new PostProcessing();
