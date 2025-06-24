import { Vector2 } from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { BrightnessContrastShader } from 'three/addons/shaders/BrightnessContrastShader.js';

import Camera from '@99Stud/webgl/components/Camera';
import Renderer from '@99Stud/webgl/components/Renderer';
import Scene from '@99Stud/webgl/components/Scene';
import WebGLStore from '@99Stud/webgl/store/WebGLStore';
import { postProcessingFolder } from '@99Stud/webgl/utils/debugger';

// import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
// import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// import { LUTPass } from 'three/addons/postprocessing/LUTPass.js';
// import { LUTCubeLoader } from 'three/addons/loaders/LUTCubeLoader.js';

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
  brightnessContrast: {
    enabled: true,
    brightness: 0,
    contrast: 0,
  },
};

class PostProcessing {
  constructor() {
    this.initialized = false;
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
    this.resolution = new Vector2();
    this.renderPass = new RenderPass(Scene, Camera);

    this.outputPass = new OutputPass();

    this.setupSMAA(w, h);
    this.setupGTAO();
    this.setupBrightnessContrast();

    this.composer.addPass(this.renderPass);
    this.composer.addPass(this.smaaPass);
    this.composer.addPass(this.gtaoPass);
    this.composer.addPass(this.brightnessContrastPass);
    this.composer.addPass(this.outputPass);

    this.composer.setSize(w, h);
    this.composer.setPixelRatio(dpr);

    this.initialized = true;
  }

  setupSMAA(w, h) {
    this.smaaPass = new SMAAPass(w, h);

    const smaaFolder = postProcessingFolder.addFolder({ title: 'SMAA Pass' });

    smaaFolder.addBinding(PARAMS.smaa, 'quality').on('change', (ev) => {
      this.smaaPass.quality = ev.value;
    });
    smaaFolder.addBinding(PARAMS.smaa, 'enabled').on('change', (ev) => {
      this.smaaPass.enabled = ev.value;
    });
  }

  setupGTAO() {
    this.gtaoPass = new GTAOPass(Scene, Camera);

    const gtaoFolder = postProcessingFolder.addFolder({ title: 'GTAO Pass' });

    gtaoFolder.addBinding(PARAMS.gtao, 'enabled').on('change', (ev) => {
      this.gtaoPass.enabled = ev.value;
    });

    gtaoFolder
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
    gtaoFolder
      .addBinding(PARAMS.gtao, 'blendIntensity', { min: 0, max: 1, step: 0.01 })
      .on('change', (ev) => {
        this.gtaoPass.blendIntensity = ev.value;
      });

    gtaoFolder
      .addBinding(PARAMS.gtao.ao, 'samples', { min: 1, max: 64, step: 1 })
      .on('change', () => {
        this.gtaoPass.updateGtaoMaterial(PARAMS.gtao.ao);
      });
    gtaoFolder.addBinding(PARAMS.gtao.ao, 'radius', { min: 0.0, max: 1.0 }).on('change', () => {
      this.gtaoPass.updateGtaoMaterial(PARAMS.gtao.ao);
    });
  }

  setupBrightnessContrast() {
    this.brightnessContrastPass = new ShaderPass(BrightnessContrastShader);

    const bcFolder = postProcessingFolder.addFolder({ title: 'Brightness Contrast Pass' });

    bcFolder.addBinding(PARAMS.brightnessContrast, 'enabled').on('change', (ev) => {
      this.brightnessContrastPass.enabled = ev.value;
    });

    bcFolder
      .addBinding(PARAMS.brightnessContrast, 'brightness', { min: 0, max: 0.5, step: 0.01 })
      .on('change', (ev) => {
        this.brightnessContrastPass.material.uniforms.brightness.value = ev.value;
      });
    bcFolder
      .addBinding(PARAMS.brightnessContrast, 'contrast', { min: 0, max: 0.5, step: 0.01 })
      .on('change', (ev) => {
        this.brightnessContrastPass.material.uniforms.contrast.value = ev.value;
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
