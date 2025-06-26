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
import { postProcessingFolder } from '@99Stud/webgl/utils/debugger';

// import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
// import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// import { LUTPass } from 'three/addons/postprocessing/LUTPass.js';
// import { LUTCubeLoader } from 'three/addons/loaders/LUTCubeLoader.js';

const isWebGLDebug = process.env.NEXT_PUBLIC_WEBGL_DEBUG === 'true';

const PARAMS = {
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

    if (isWebGLDebug) this.addDebugFolders();
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

  addDebugFolders() {
    this.smaaFolder = postProcessingFolder.addFolder({ title: 'SMAA Pass' });
    this.gtaoFolder = postProcessingFolder.addFolder({ title: 'GTAO Pass' });

    this.brightnessContrastFolder = postProcessingFolder.addFolder({
      title: 'Brightness Contrast Pass',
    });

    this.toneMappingFolder = postProcessingFolder.addFolder({ title: 'Tone Mapping Pass' });

    this.gammaCorrectionFolder = postProcessingFolder.addFolder({ title: 'Gamma Correction Pass' });

    this.bloomFolder = postProcessingFolder.addFolder({ title: 'Bloom Pass' });
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
  }

  render() {
    this.composer.render();
  }
}

// eslint-disable-next-line import/no-anonymous-default-export
export default new PostProcessing();
