import {
  DepthTexture,
  HalfFloatType,
  Mesh,
  MeshBasicMaterial,
  NearestFilter,
  OrthographicCamera,
  PlaneGeometry,
  RGBAFormat,
  ShaderMaterial,
  Scene as ThreeScene,
  WebGLRenderTarget,
} from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { FilmPass } from 'three/addons/postprocessing/FilmPass.js';
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
import { MotionBlurPass } from '@99Stud/webgl/passes/motionBlurPass';
import WebGLStore from '@99Stud/webgl/store/WebGLStore';
import { postProcessingFolder } from '@99Stud/webgl/utils/debugger';

// import { LUTPass } from 'three/addons/postprocessing/LUTPass.js';
// import { LUTCubeLoader } from 'three/addons/loaders/LUTCubeLoader.js';

const isWebGLDebug = process.env.NEXT_PUBLIC_WEBGL_DEBUG === 'true';

const PARAMS = {
  debug: {
    showDepth: false,
    fullScreenDepth: false,
    depthScale: 10.0,
    depthNear: 0.1,
    depthFar: 100.0,
    useLogScale: true,
    forcePackedDepth: false,
  },
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
    enabled: true,
    brightness: 0.3,
    contrast: 0,
    saturation: 0,
    strength: 0.57,
    upRadius: 1.52,
    downRadius: 4.24,
    mixFactor: 0.34,
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
  filmGrain: {
    enabled: true,
    intensity: 1.0,
    grayscale: false,
  },
  motionBlur: {
    enabled: false,
    intensity: 0.9,
  },
};

class PostProcessing {
  constructor() {
    this.initialized = false;
    this.composer = null;
  }

  async init() {
    if (this.initialized) {
      // eslint-disable-next-line no-console
      console.warn('PostProcessing already initialized');
      return;
    }

    const { width: w, height: h, dpr } = WebGLStore.viewport;

    this.setupDepthVisualization();

    this.composer = this.setupComposer();
    this.composer.enabled = true;

    // Clear settings ensure proper depth buffer setup
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
    this.setupFilmGrainPass();
    this.setupMotionBlurPass();

    this.composer.addPass(this.renderPass);
    this.composer.addPass(this.smaaPass);
    this.composer.addPass(this.gtaoPass);
    this.composer.addPass(this.motionBlurPass);
    this.composer.addPass(this.filmGrainPass);
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(this.brightnessContrastPass);
    this.composer.addPass(this.toneMappingPass);
    this.composer.addPass(this.gammaCorrectionPass);
    this.composer.addPass(this.outputPass);

    this.composer.setSize(w, h);
    this.composer.setPixelRatio(dpr);

    this.initialized = true;
  }

  setupComposer() {
    const { width: w, height: h } = WebGLStore.viewport;
    const params = {
      format: RGBAFormat,
      type: HalfFloatType,
      minFilter: NearestFilter,
      magFilter: NearestFilter,
    };

    const rt = new WebGLRenderTarget(w, h, params);
    rt.depthTexture = new DepthTexture(w, h);

    const composer = new EffectComposer(Renderer, rt);
    return composer;
  }

  setupSMAA(w, h) {
    this.smaaPass = new SMAAPass(w, h);
    this.smaaPass.enabled = PARAMS.smaa.enabled;

    if (!isWebGLDebug) return;

    this.smaaFolder = postProcessingFolder.addFolder({ title: 'SMAA Pass' });

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

    this.gtaoFolder = postProcessingFolder.addFolder({ title: 'GTAO Pass' });

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

    this.brightnessContrastFolder = postProcessingFolder.addFolder({
      title: 'Brightness Contrast Pass',
    });

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

    this.toneMappingFolder = postProcessingFolder.addFolder({ title: 'Tone Mapping Pass' });

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

    this.gammaCorrectionFolder = postProcessingFolder.addFolder({ title: 'Gamma Correction Pass' });

    this.gammaCorrectionFolder.addBinding(PARAMS.gammaCorrection, 'enabled').on('change', (ev) => {
      this.gammaCorrectionPass.enabled = ev.value;
    });
  }

  setupBloomPass() {
    this.bloomPass = new BloomPass();
    this.bloomPass.enabled = PARAMS.bloom.enabled;

    if (!isWebGLDebug) return;

    this.bloomFolder = postProcessingFolder.addFolder({ title: 'Bloom Pass' });

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

  setupFilmGrainPass() {
    this.filmGrainPass = new FilmPass();

    if (!isWebGLDebug) return;

    this.filmGrainFolder = postProcessingFolder.addFolder({ title: 'Film Grain Pass' });

    this.filmGrainFolder.addBinding(PARAMS.filmGrain, 'enabled').on('change', (ev) => {
      this.filmGrainPass.enabled = ev.value;
    });

    this.filmGrainFolder
      .addBinding(PARAMS.filmGrain, 'intensity', { min: 0, max: 10, step: 0.01 })
      .on('change', (ev) => {
        this.filmGrainPass.material.uniforms.intensity.value = ev.value;
      });

    this.filmGrainFolder.addBinding(PARAMS.filmGrain, 'grayscale').on('change', (ev) => {
      this.filmGrainPass.material.uniforms.grayscale.value = ev.value;
    });
  }

  setupMotionBlurPass() {
    this.motionBlurPass = new MotionBlurPass();
    this.motionBlurPass.enabled = PARAMS.motionBlur.enabled;

    if (!isWebGLDebug) return;

    this.motionBlurFolder = postProcessingFolder.addFolder({ title: 'Motion Blur Pass' });

    this.motionBlurFolder.addBinding(PARAMS.motionBlur, 'enabled').on('change', (ev) => {
      this.motionBlurPass.enabled = ev.value;
    });

    this.motionBlurFolder
      .addBinding(PARAMS.motionBlur, 'intensity', { min: 0, max: 1, step: 0.01 })
      .on('change', (ev) => {
        this.motionBlurPass.settings.render.intensity = ev.value;
      });
  }

  setupDepthVisualization() {
    this.depthVisualizationMaterial = new ShaderMaterial({
      uniforms: {
        tDepth: { value: null },
        cameraNear: { value: 0.1 },
        cameraFar: { value: 100.0 },
        depthScale: { value: 10.0 },
        useLogScale: { value: true },
        forcePackedDepth: { value: false },
      },
      vertexShader: `
        varying vec2 vUv;

        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform sampler2D tDepth;
        uniform float cameraNear;
        uniform float cameraFar;
        uniform float depthScale;
        uniform bool useLogScale;
        uniform bool forcePackedDepth;

        #include <packing>

        // Read depth value with automatic format detection and manual override
        float readDepth(vec2 coord) {
          vec4 depthSample = texture2D(tDepth, coord);
          
          if (forcePackedDepth) {
            // Force packed RGBA format for testing
            return unpackRGBAToDepth(depthSample);
          }
          
          // Automatic format detection
          // Native depth textures store depth in red channel, other channels are typically 0 or unused
          // Packed RGBA depth distributes data across channels with specific bit patterns
          float totalChannelData = depthSample.g + depthSample.b + abs(depthSample.a - 1.0);
          
          if (totalChannelData > 0.001) {
            // High confidence this is packed RGBA depth format
            return unpackRGBAToDepth(depthSample);
          } else {
            // This appears to be native depth format
            return depthSample.r;
          }
        }

        // Correct depth linearization for perspective projection
        float linearizeDepth(float depth, float near, float far) {
          // Convert depth buffer value [0,1] to NDC [-1,1]
          float z = depth * 2.0 - 1.0;
          
          // Convert NDC to linear view space depth
          return (2.0 * near * far) / (far + near - z * (far - near));
        }

        // Enhanced depth visualization with multiple scaling options
        float visualizeDepth(float depth, float near, float far, float scale, bool useLog) {
          float linear = linearizeDepth(depth, near, far);
          
          // Normalize to [0,1] range
          float normalizedDepth = (linear - near) / (far - near);
          
          if (useLog) {
            // Apply logarithmic scaling for better detail distribution
            float logDepth = log(1.0 + normalizedDepth * scale) / log(1.0 + scale);
            return logDepth;
          } else {
            // Linear scaling with enhanced contrast
            return pow(normalizedDepth * scale, 0.5);
          }
        }

        void main() {
          float rawDepth = readDepth(vUv);
          
          // Skip background pixels (depth = 1.0)
          if (rawDepth >= 0.9999) {
            gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); // Black background
            return;
          }
          
          // Visualize depth with enhanced detail
          float depth = visualizeDepth(rawDepth, cameraNear, cameraFar, depthScale, useLogScale);
          
          // Invert for better visualization (close = white, far = black)
          depth = 1.0 - depth;
          
          // Apply contrast enhancement for better detail visibility
          depth = smoothstep(0.1, 0.9, depth);
          
          gl_FragColor = vec4(vec3(depth), 1.0);
        }
      `,
      depthWrite: true,
      depthTest: true,
    });

    const quadGeometry = new PlaneGeometry(2, 2);
    const quadMaterial = new MeshBasicMaterial({ depthTest: false, depthWrite: false });

    this.debugQuad = new Mesh(quadGeometry, quadMaterial);
    this.debugScene = new ThreeScene();
    this.debugCamera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 1000);
    this.debugScene.add(this.debugQuad);

    // Setup debug controls
    this.setupDepthDebugControls();
  }

  setupDepthDebugControls() {
    if (!isWebGLDebug) return;

    this.depthFolder = postProcessingFolder.addFolder({ title: 'Depth Visualization' });

    this.depthFolder.addBinding(PARAMS.debug, 'showDepth').on('change', (_ev) => {
      // Toggle will be handled in render method
    });

    this.depthFolder.addBinding(PARAMS.debug, 'fullScreenDepth').on('change', (_ev) => {
      // Full-screen mode toggle
    });

    this.depthFolder.addBinding(PARAMS.debug, 'useLogScale').on('change', (ev) => {
      if (this.depthVisualizationMaterial) {
        this.depthVisualizationMaterial.uniforms.useLogScale.value = ev.value;
      }
    });

    this.depthFolder.addBinding(PARAMS.debug, 'forcePackedDepth').on('change', (ev) => {
      if (this.depthVisualizationMaterial) {
        this.depthVisualizationMaterial.uniforms.forcePackedDepth.value = ev.value;
      }
    });

    this.depthFolder
      .addBinding(PARAMS.debug, 'depthScale', { min: 0.1, max: 50.0, step: 0.1 })
      .on('change', (ev) => {
        if (this.depthVisualizationMaterial) {
          this.depthVisualizationMaterial.uniforms.depthScale.value = ev.value;
        }
      });

    this.depthFolder
      .addBinding(PARAMS.debug, 'depthNear', { min: 0.01, max: 10.0, step: 0.01 })
      .on('change', (ev) => {
        if (this.depthVisualizationMaterial) {
          this.depthVisualizationMaterial.uniforms.cameraNear.value = ev.value;
        }
      });

    this.depthFolder
      .addBinding(PARAMS.debug, 'depthFar', { min: 10.0, max: 10000.0, step: 10.0 })
      .on('change', (ev) => {
        if (this.depthVisualizationMaterial) {
          this.depthVisualizationMaterial.uniforms.cameraFar.value = ev.value;
        }
      });
  }

  renderFullScreenDepth() {
    if (!this.debugQuad || !this.depthVisualizationMaterial) return;

    // First render the scene to generate depth
    Renderer.setRenderTarget(this.composer.writeBuffer);
    Renderer.render(Scene, Camera);
    Renderer.setRenderTarget(null);

    // Get depth texture from composer's write buffer
    const depthTexture = this.composer.writeBuffer.depthTexture;
    if (!depthTexture) return;

    // Update depth visualization material with all parameters
    this.depthVisualizationMaterial.uniforms.tDepth.value = depthTexture;
    this.depthVisualizationMaterial.uniforms.cameraNear.value = Camera.near;
    this.depthVisualizationMaterial.uniforms.cameraFar.value = Camera.far;
    this.depthVisualizationMaterial.uniforms.depthScale.value = PARAMS.debug.depthScale;
    this.depthVisualizationMaterial.uniforms.useLogScale.value = PARAMS.debug.useLogScale;
    this.depthVisualizationMaterial.uniforms.forcePackedDepth.value = PARAMS.debug.forcePackedDepth;

    const originalMaterial = this.debugQuad.material;
    this.debugQuad.material = this.depthVisualizationMaterial;
    this.debugQuad.position.set(0, 0, -1);
    this.debugQuad.scale.setScalar(1);

    Renderer.render(this.debugScene, this.debugCamera);

    // Restore original material
    this.debugQuad.material = originalMaterial;
  }

  renderDepthVisualization() {
    if (!this.debugQuad || !this.depthVisualizationMaterial) return;

    // Get depth texture from composer's read buffer
    const depthTexture = this.composer.readBuffer.depthTexture;
    if (!depthTexture) return;

    // Update depth visualization material with all current parameters
    this.depthVisualizationMaterial.uniforms.tDepth.value = depthTexture;
    this.depthVisualizationMaterial.uniforms.cameraNear.value = Camera.near;
    this.depthVisualizationMaterial.uniforms.cameraFar.value = Camera.far;
    this.depthVisualizationMaterial.uniforms.depthScale.value = PARAMS.debug.depthScale;
    this.depthVisualizationMaterial.uniforms.useLogScale.value = PARAMS.debug.useLogScale;
    this.depthVisualizationMaterial.uniforms.forcePackedDepth.value = PARAMS.debug.forcePackedDepth;

    // Temporarily switch material to depth visualization
    const originalMaterial = this.debugQuad.material;
    this.debugQuad.material = this.depthVisualizationMaterial;

    // Position debug quad in top-right corner (quarter size)
    this.debugQuad.position.set(0.5, 0.5, -1);
    this.debugQuad.scale.setScalar(0.5);

    // Render depth visualization overlay
    Renderer.autoClear = false;
    Renderer.render(this.debugScene, this.debugCamera);
    Renderer.autoClear = true;

    // Restore original material
    this.debugQuad.material = originalMaterial;
  }

  render() {
    this.composer.render();

    if (PARAMS.debug.showDepth && !PARAMS.debug.fullScreenDepth && isWebGLDebug) {
      this.renderDepthVisualization();
    }

    if (PARAMS.debug.showDepth && PARAMS.debug.fullScreenDepth && isWebGLDebug) {
      this.renderFullScreenDepth();
      return;
    }
  }

  onResize() {
    const { width, height, dpr } = WebGLStore.viewport;
    this.composer.setSize(width, height);
    this.composer.setPixelRatio(dpr);
  }

  dispose() {
    if (!this.initialized) return;

    if (this.composer) {
      this.composer.dispose();
    }

    if (this.depthVisualizationMaterial) {
      this.depthVisualizationMaterial.dispose();
    }

    if (this.debugQuad) {
      this.debugQuad.geometry.dispose();
      this.debugQuad.material.dispose();
    }

    this.initialized = false;
  }
}

// eslint-disable-next-line import/no-anonymous-default-export
export default new PostProcessing();
