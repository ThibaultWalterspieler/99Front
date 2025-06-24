import {
  AdditiveBlending,
  Color,
  Mesh,
  Object3D,
  PlaneGeometry,
  RepeatWrapping,
  ShaderMaterial,
  Vector2,
} from 'three';

import WebGLStore from '@99Stud/webgl/store/WebGLStore';
import { sceneFolder } from '@99Stud/webgl/utils/debugger';
import { getAsset } from '@99Stud/webgl/utils/manifest/assetsLoader';

const PARAMS = {
  uniforms: {
    uIterations: { value: 10 },
    uScale: { value: 1 },
    uSpeed: { value: 1 },
    tTexture: { value: null },
    uColorTexture: { value: new Color(1, 1, 1) },
    uAlpha: { value: 0.1 },
    uCellScale: { value: 6.0 },
    uTimeScale: { value: 30.0 },
    uThresholdMin: { value: 0.92 },
    uThresholdMax: { value: 1.0 },
    uTransitionWidth: { value: 1.0 },
    uAnimationOffset: { value: 1.0 },
  },
};

const geometry = new PlaneGeometry(WebGLStore.viewport.width, WebGLStore.viewport.height, 1, 1);

export default class TextureTunnel extends Object3D {
  constructor(options) {
    super(options);
    this.name = options?.name ? `TextureTunnel-${options.name}` : `TextureTunnel`;
    this.settings = { ...options, ...PARAMS };

    this.init();
    this.addDebug();
  }

  init() {
    const texture = getAsset('tex-99stud');
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
    texture.flipY = true;

    const material = new ShaderMaterial({
      uniforms: {
        ...this.settings.uniforms,
        uTime: { value: 0 },
        uResolution: { value: new Vector2(WebGLStore.viewport.width, WebGLStore.viewport.height) },
        tTexture: { value: texture },
        uCellScale: { value: new Vector2(1, 1) },
      },
      vertexShader: `
                varying vec2 vUv;

                void main() {
                    vUv = uv * 3.0;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
      fragmentShader: `
                uniform float uTime;
                uniform vec2 uResolution;
                uniform sampler2D tTexture;
                uniform vec2 uCellScale;

                varying vec2 vUv;

                #define PI 3.1415926535897932384626433832795

                vec4 coverTexture(sampler2D tex, vec2 imgSize, vec2 ouv, vec2 res) {
                    vec2 s = res;
                    vec2 i = imgSize;
                    float rs = s.x / s.y;
                    float ri = i.x / i.y;
                    vec2 new = rs < ri ? vec2(i.x * s.y / i.y, s.y) : vec2(s.x, i.y * s.x / i.x);
                    vec2 offset = (rs < ri ? vec2((new.x - s.x) / 2.0, 0.0) : vec2(0.0, (new.y - s.y) / 2.0)) / new;
                    vec2 uv = ouv * s / new + offset;

                    return texture2D(tex, uv);
                }

                const mat2 myt = mat2(.12121212, .13131313, -.13131313, .12121212);
                const vec2 mys = vec2(1e4, 1e6);

                vec2 rhash(vec2 uv) {
                    uv *= myt;
                    uv *= mys;
                    return fract(fract(uv / mys) * uv);
                }

                void main() {
                    vec2 st = gl_FragCoord.xy / uResolution;
                    vec2 uv = vUv;

                    vec2 diffuseSize = vec2(textureSize(tTexture, 0));
                    vec2 textureOffset = vec2(0.5, 0.5) - 1.0;
                    vec4 diffuse = coverTexture(tTexture, diffuseSize, st + textureOffset, uResolution);



                    gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
                }
            `,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: AdditiveBlending,
    });

    this.mesh = new Mesh(geometry, material);
    this.mesh.position.set(0, 0, 0);
    this.add(this.mesh);

    texture.dispose();
  }

  onTick({ time }) {
    const { uTime } = this.mesh.material.uniforms;
    uTime.value = time * 0.0075;
  }

  onResize() {
    const { uResolution } = this.mesh.material.uniforms;
    const { width, height } = WebGLStore.viewport;
    uResolution.value.set(width, height);
  }

  addDebug() {
    if (!sceneFolder) return;
    const {
      uCellScale,
      uTimeScale,
      uThresholdMin,
      uThresholdMax,
      uTransitionWidth,
      uAnimationOffset,
    } = this.settings.uniforms;

    const folder = sceneFolder.addFolder({ title: 'TextTunnel' });

    folder
      .addBinding(uCellScale, 'value', { label: 'Cell Scale', min: 0, max: 10, step: 0.01 })
      .on('change', (ev) => {
        this.mesh.material.uniforms.uCellScale.value = ev.value;
      });

    folder
      .addBinding(uTimeScale, 'value', { label: 'Time Scale', min: 0, max: 500, step: 1.0 })
      .on('change', (ev) => {
        this.mesh.material.uniforms.uTimeScale.value = ev.value;
      });

    folder
      .addBinding(uThresholdMin, 'value', { label: 'Threshold Min', min: 0, max: 1, step: 0.01 })
      .on('change', (ev) => {
        this.mesh.material.uniforms.uThresholdMin.value = ev.value;
      });

    folder
      .addBinding(uThresholdMax, 'value', { label: 'Threshold Max', min: 0, max: 1, step: 0.01 })
      .on('change', (ev) => {
        this.mesh.material.uniforms.uThresholdMax.value = ev.value;
      });

    folder
      .addBinding(uTransitionWidth, 'value', {
        label: 'Transition Width',
        min: 0,
        max: 1,
        step: 0.01,
      })
      .on('change', (ev) => {
        this.mesh.material.uniforms.uTransitionWidth.value = ev.value;
      });

    folder
      .addBinding(uAnimationOffset, 'value', {
        label: 'Animation Offset',
        min: 0,
        max: 1,
        step: 0.01,
      })
      .on('change', (ev) => {
        this.mesh.material.uniforms.uAnimationOffset.value = ev.value;
      });
  }
  dispose() {}
}
