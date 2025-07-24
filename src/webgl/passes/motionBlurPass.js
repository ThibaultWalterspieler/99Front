import {
  ClampToEdgeWrapping,
  HalfFloatType,
  LinearFilter,
  ShaderMaterial,
  Vector2,
  WebGLRenderTarget,
} from 'three';
import { FullScreenQuad, Pass } from 'three/addons/postprocessing/Pass.js';
import { CopyShader } from 'three/addons/shaders/CopyShader.js';

const VSH_GENERIC = `
    varying vec2 vUvs;

    void main() {	
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        vUvs = uv;
    }
`;

const FSH_MOTION_BLUR = `
    uniform sampler2D frameTexture;
    uniform sampler2D lastFrameTexture;
    uniform float intensity;
    varying vec2 vUvs;

    void main() {
        vec2 uv = vUvs;
        vec4 currentFrame = texture2D(frameTexture, uv);
        vec4 lastFrame = texture2D(lastFrameTexture, uv);
        
        // Blend between current and last frame based on intensity
        gl_FragColor = mix(currentFrame, lastFrame, intensity);
    }
`;

const MOTION_BLUR_SHADER = {
  uniforms: {
    frameTexture: { value: null },
    lastFrameTexture: { value: null },
    intensity: { value: 0.9 },
  },
  vertexShader: VSH_GENERIC,
  fragmentShader: FSH_MOTION_BLUR,
};

class MotionBlurPassOptions {
  constructor() {
    this.render = {
      intensity: 0.9,
    };

    this.setup = {
      levels: 1,
    };
  }
}

export class MotionBlurPass extends Pass {
  #quad_ = null;
  #passes_ = {};
  #targets_ = {};
  #currentRenderTarget = null;
  #lastRenderTarget = null;
  #resolution = new Vector2();

  constructor(options) {
    super();

    this.needsSwap = true;
    this.settings =
      options instanceof MotionBlurPassOptions ? options : new MotionBlurPassOptions();

    this.#quad_ = new FullScreenQuad(null);

    this.#createRenderTargets_();
    this.#createPasses_();
  }

  #createRenderTarget_(name, scale, params) {
    this.#targets_[name] = {
      buffer: new WebGLRenderTarget(1, 1, params),
      params: params,
      scale: scale,
    };
  }

  #createRenderTargets_() {
    const bufferParams = {
      type: HalfFloatType,
      magFilter: LinearFilter,
      minFilter: LinearFilter,
      wrapS: ClampToEdgeWrapping,
      wrapT: ClampToEdgeWrapping,
    };

    // Create two main render targets for ping-pong
    this.#currentRenderTarget = new WebGLRenderTarget(1, 1, bufferParams);
    this.#lastRenderTarget = new WebGLRenderTarget(1, 1, bufferParams);

    // Create additional targets for multi-pass blur if needed
    for (let i = 0; i <= this.settings.setup.levels; i++) {
      this.#createRenderTarget_('unity-downsample-' + i, 1.0 / 2 ** i, bufferParams);
      this.#createRenderTarget_('unity-upsample-' + i, 1.0 / 2 ** i, bufferParams);
    }
  }

  #createPasses_() {
    this.#createPass_('copy-texture', CopyShader);
    this.#createPass_('unity-downsample', MOTION_BLUR_SHADER);
    this.#createPass_('unity-upsample', MOTION_BLUR_SHADER);
    this.#createPass_('unity-composite', MOTION_BLUR_SHADER);
  }

  #createPass_(name, shaderData) {
    const material = new ShaderMaterial(shaderData);
    this.#passes_[name] = material;
  }

  #renderPass_(name, renderer, targetBuffer) {
    this.#quad_.material = this.#passes_[name];
    renderer.setRenderTarget(targetBuffer);
    this.#quad_.render(renderer);
    renderer.setRenderTarget(null);
  }

  render(renderer, writeBuffer, readBuffer, _deltaTime, _maskActive) {
    // Update uniforms
    const blurMaterial = this.#passes_['unity-composite'];
    blurMaterial.uniforms.frameTexture.value = readBuffer.texture;
    blurMaterial.uniforms.lastFrameTexture.value = this.#lastRenderTarget.texture;
    blurMaterial.uniforms.intensity.value = this.settings.render.intensity;

    // Render the motion blur effect
    this.#renderPass_('unity-composite', renderer, this.#currentRenderTarget);

    // Copy result to the output buffer
    this.#quad_.material = this.#passes_['copy-texture'];
    this.#quad_.material.uniforms.tDiffuse.value = this.#currentRenderTarget.texture;
    renderer.setRenderTarget(writeBuffer);
    this.#quad_.render(renderer);

    // Swap render targets for next frame
    const temp = this.#currentRenderTarget;
    this.#currentRenderTarget = this.#lastRenderTarget;
    this.#lastRenderTarget = temp;
  }

  setSize(width, height) {
    this.#resolution.set(width, height);

    // Resize main render targets
    this.#currentRenderTarget.setSize(width, height);
    this.#lastRenderTarget.setSize(width, height);

    // Resize additional targets
    for (const target of Object.values(this.#targets_)) {
      const w = Math.round(width * target.scale);
      const h = Math.round(height * target.scale);
      target.buffer.setSize(w, h);
    }
  }

  dispose() {
    this.#quad_.dispose();
    this.#currentRenderTarget.dispose();
    this.#lastRenderTarget.dispose();

    for (const target of Object.values(this.#targets_)) {
      target.buffer.dispose();
    }

    for (const pass of Object.values(this.#passes_)) {
      pass.dispose();
    }
  }
}
