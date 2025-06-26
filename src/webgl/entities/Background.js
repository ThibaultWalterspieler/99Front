import {
  BackSide,
  Color,
  Mesh,
  Object3D,
  ShaderMaterial,
  SphereGeometry,
  SRGBColorSpace,
  Vector2,
  Vector3,
} from 'three';
import { degToRad } from 'three/src/math/MathUtils.js';

import { BACKGROUND_PARAMS } from '@99Stud/webgl/store/constants';
import WebGLStore from '@99Stud/webgl/store/WebGLStore';
import { sceneFolder } from '@99Stud/webgl/utils/debugger';
import { getAsset } from '@99Stud/webgl/utils/manifest/assetsLoader';

const geometry = new SphereGeometry(10, 16, 32);

export default class Background extends Object3D {
  constructor(options) {
    super(options);

    this.name = options?.name ? `Background-${options.name}` : `Background`;
    this.settings = { ...BACKGROUND_PARAMS, ...options?.settings };

    this.scale.setScalar(1);
    this.rotation.y = degToRad(90);

    this.init();
    this.addDebug();
  }

  init() {
    const texture = getAsset('tex-gradient');
    texture.colorSpace = SRGBColorSpace;
    const material = new ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        tGrad: { value: texture },
        tBlueNoise: { value: getAsset('tex-bluenoise') },
        uResolution: { value: new Vector3() },
        uColorInner: { value: new Color(this.settings.colorInner) },
        uColorMid: { value: new Color(this.settings.colorMid) },
        uColorOuter: { value: new Color(this.settings.colorOuter) },
        uGradientScale1: { value: this.settings.gradientScale1 },
        uGradientScale2: { value: this.settings.gradientScale2 },
        uGradientScale3: { value: this.settings.gradientScale3 },
        uGradientSpeed: { value: this.settings.gradientSpeed },
        uBlurriness: { value: this.settings.blurriness },
        uBlueNoiseCoordOffset: { value: new Vector2(0.05, 0.05) },
      },
      vertexShader: `
                varying vec2 vUv;

                void main() {
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    vUv = uv;
                }
            `,
      fragmentShader: `
                precision highp float;

                uniform float uTime;
                uniform sampler2D tGrad;
                uniform sampler2D tBlueNoise;
                uniform vec3 uResolution;
                uniform vec3 uColorInner;
                uniform vec3 uColorMid;
                uniform vec3 uColorOuter;
                uniform vec2 uBlueNoiseCoordOffset;
                uniform float uBlurriness;
                uniform float uGradientScale1;
                uniform float uGradientScale2;
                uniform float uGradientScale3;
                uniform float uGradientSpeed;

                varying vec2 vUv;

                #define PI 3.14159265

                vec4 getNoise(sampler2D tex, vec2 uv, vec2 offset) {
                    float invSize = 1.0/float(textureSize(tex, 0).x);
                    return texture(tex, uv*invSize+offset);
                }

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

                // AshimaOptim https://www.shadertoy.com/view/Xd3GRf
                vec4 permute(vec4 x) { return mod(((x*34.)+1.)*x, 289.); }
                    float snoise(in vec3 v){
                    const vec2 C = vec2(0.16666666666,0.33333333333);
                    const vec4 D = vec4(0,.5,1,2);
                    vec3 i  = floor(C.y*(v.x+v.y+v.z) + v);
                    vec3 x0 = C.x*(i.x+i.y+i.z) + (v - i);
                    vec3 g = step(x0.yzx, x0);
                    vec3 l = (1. - g).zxy;
                    vec3 i1 = min( g, l );
                    vec3 i2 = max( g, l );
                    vec3 x1 = x0 - i1 + C.x;
                    vec3 x2 = x0 - i2 + C.y;
                    vec3 x3 = x0 - D.yyy;
                    i = mod(i,289.);
                    vec4 p = permute( permute( permute( i.z + vec4(0., i1.z, i2.z, 1.)) + i.y + vec4(0., i1.y, i2.y, 1.))+ i.x + vec4(0., i1.x, i2.x, 1.));
                    vec3 ns = .142857142857 * D.wyz - D.xzx;
                    vec4 j = -49. * floor(p * ns.z * ns.z) + p;
                    vec4 x_ = floor(j * ns.z);
                    vec4 x = x_ * ns.x + ns.yyyy;
                    vec4 y = floor(j - 7. * x_ ) * ns.x + ns.yyyy;
                    vec4 h = 1. - abs(x) - abs(y);
                    vec4 b0 = vec4( x.xy, y.xy );
                    vec4 b1 = vec4( x.zw, y.zw );
                    vec4 sh = -step(h, vec4(0.));
                    vec4 a0 = b0.xzyw + (floor(b0)*2.+ 1.).xzyw*sh.xxyy;
                    vec4 a1 = b1.xzyw + (floor(b1)*2.+ 1.).xzyw*sh.zzww;
                    vec3 p0 = vec3(a0.xy,h.x);
                    vec3 p1 = vec3(a0.zw,h.y);
                    vec3 p2 = vec3(a1.xy,h.z);
                    vec3 p3 = vec3(a1.zw,h.w);
                    vec4 norm = inversesqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
                    p0 *= norm.x;
                    p1 *= norm.y;
                    p2 *= norm.z;
                    p3 *= norm.w;
                    vec4 m = max(.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.);
                    return .5 + 12. * dot( m * m * m, vec4( dot(p0,x0), dot(p1,x1),dot(p2,x2), dot(p3,x3) ) );
                }


                void main() {
                    vec2 st = gl_FragCoord.xy / uResolution.xy;
                    vec2 uv = (2.0*gl_FragCoord.xy-uResolution.xy)/uResolution.y;
                    vec2 pixelUnit = 1. / uResolution.xy;

                    // Sample base gradient with higher precision sampling
                    vec3 col = coverTexture(tGrad, vec2(1920., 1080.), st, uResolution.xy).rgb;
                    
                    // Smooth noise application with heavy filtering
                    float noise = snoise(vec3(uv * uGradientScale1, uTime * uGradientSpeed));
                    float noiseSecond = snoise(vec3(uv * uGradientScale2, uTime * uGradientSpeed));
                    float noiseThird = snoise(vec3(uv * uGradientScale3, uTime * uGradientSpeed));
                    
                    // Apply multiple smoothing passes to eliminate any stepping
                    noise = smoothstep(-1.0, 1.0, noise);
                    noise = smoothstep(0.0, 1.0, noise); // Double smoothstep for extra smoothness
                    noiseSecond = smoothstep(-1.0, 1.0, noiseSecond);
                    noiseSecond = smoothstep(0.0, 1.0, noiseSecond);
                    noiseThird = smoothstep(-1.0, 1.0, noiseThird);
                    noiseThird = smoothstep(0.0, 1.0, noiseThird);
                    
                    // Very gradual color mixing with micro-steps
                    col = mix(col, uColorInner, noise * 0.1); // Very subtle
                    col = mix(col, uColorOuter, noiseThird * 0.45); // Reduced
                    col = mix(col, uColorMid, noiseSecond * 0.4); // Reduced
                    
                    // Blue noise dithering with very small magnitude to prevent banding
                    vec4 blueNoise = getNoise(tBlueNoise, st, uBlueNoiseCoordOffset);
                    vec3 dither = (blueNoise.rgb - 0.5) * (1.0/255.0); // Center around 0, ±0.5 levels
                    col += dither;
                    
                    gl_FragColor = vec4(col, 1.);
                }

            `,
      side: BackSide,
    });

    this.mesh = new Mesh(geometry, material);
    this.add(this.mesh);
  }

  addDebug() {
    if (!sceneFolder) return;
    const folder = sceneFolder.addFolder({ title: 'Background' });

    folder
      .addBinding(this.settings, 'gradientScale1', { min: 0, max: 5, step: 0.001 })
      .on('change', (ev) => {
        this.mesh.material.uniforms.uGradientScale1.value = ev.value;
      });

    folder
      .addBinding(this.settings, 'gradientScale2', { min: 0, max: 5, step: 0.001 })
      .on('change', (ev) => {
        this.mesh.material.uniforms.uGradientScale2.value = ev.value;
      });

    folder
      .addBinding(this.settings, 'gradientScale3', { min: 0, max: 5, step: 0.001 })
      .on('change', (ev) => {
        this.mesh.material.uniforms.uGradientScale3.value = ev.value;
      });

    folder
      .addBinding(this.settings, 'gradientSpeed', { min: 0, max: 5, step: 0.1 })
      .on('change', (ev) => {
        this.mesh.material.uniforms.uGradientSpeed.value = ev.value;
      });

    folder.addBinding(this.settings, 'colorInner', { view: 'color' }).on('change', (ev) => {
      this.mesh.material.uniforms.uColorInner.value = new Color(ev.value);
    });

    folder.addBinding(this.settings, 'colorMid', { view: 'color' }).on('change', (ev) => {
      this.mesh.material.uniforms.uColorMid.value = new Color(ev.value);
    });

    folder.addBinding(this.settings, 'colorOuter', { view: 'color' }).on('change', (ev) => {
      this.mesh.material.uniforms.uColorOuter.value = new Color(ev.value);
    });
  }

  onResize() {
    const { width, height, dpr } = WebGLStore.viewport;
    const { uResolution } = this.mesh.material.uniforms;
    uResolution.value.set(width * dpr, height * dpr, dpr);
  }

  onTick({ time }) {
    const { uTime } = this.mesh.material.uniforms;
    uTime.value = time;
  }
}
