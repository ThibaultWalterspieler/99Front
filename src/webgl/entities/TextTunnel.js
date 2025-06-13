import {
  AdditiveBlending,
  BackSide,
  Color,
  CylinderGeometry,
  Mesh,
  Object3D,
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

const geometry = new CylinderGeometry(8, 8, 20, 64);

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
                uniform float uIterations;
                uniform float uScale;
                uniform float uSpeed;
                uniform sampler2D tTexture;
                uniform float uAlpha;
                // Cellular noise controls
                uniform float uCellScale;
                uniform float uTimeScale;
                uniform float uThresholdMin;
                uniform float uThresholdMax;
                uniform float uTransitionWidth;
                uniform float uAnimationOffset;

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

                vec3 hash(vec3 p) {
                    return fract(sin(vec3(dot(p, vec3(1.0, 57.0, 113.0)),
                                            dot(p, vec3(57.0, 113.0, 1.0)),
                                            dot(p, vec3(113.0, 1.0, 57.0)))) *
                                43758.5453);
                }

                float voronoi2d(const in vec2 point) {
                    vec2 p = floor(point);
                    vec2 f = fract(point);
                    float res = 0.0;
                    for (int j = -1; j <= 1; j++) {
                        for (int i = -1; i <= 1; i++) {
                        vec2 b = vec2(i, j);
                        vec2 r = vec2(b) - f + rhash(p + b);
                        res += 1. / pow(dot(r, r), 8.);
                        }
                    }
                    return pow(1. / res, 0.0625);
                }

                const int samples = 35,
                        LOD = 2,         // gaussian done on MIPmap at scale LOD
                        sLOD = 1 << LOD; // tile size = 2^LOD
                const float sigma = float(samples) * .25;

                float gaussian(vec2 i) {
                    return exp( -.5* dot(i/=sigma,i) ) / ( 6.28 * sigma*sigma );
                }

                vec4 blur(sampler2D sp, vec2 U, vec2 scale) {
                    vec4 O = vec4(0);  
                    int s = samples/sLOD;
                    
                    for ( int i = 0; i < s*s; i++ ) {
                        vec2 d = vec2(i%s, i/s)*float(sLOD) - float(samples)/2.;
                        O += gaussian(d) * textureLod( sp, U + scale * d , float(LOD) );
                    }
                    
                    return O / O.a;
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

                float range(float oldValue, float oldMin, float oldMax, float newMin, float newMax) {
                    vec3 sub = vec3(oldValue, newMax, oldMax) - vec3(oldMin, newMin, oldMin);
                    return sub.x * sub.y / sub.z + newMin;
                }

                void main() {
                    vec2 uv = vUv;

                    // Generate cellular noise with time-based variation
                    vec2 cellCoord = uv * uCellScale;
                    float timeOffset = uTime * uTimeScale + uAnimationOffset;
                    
                    // Create multiple layers of cellular noise for more complex patterns
                    float cellNoise1 = voronoi2d(cellCoord + timeOffset);
                    float cellNoise2 = voronoi2d(cellCoord * 1.5 + timeOffset * 0.7);
                    
                    // Combine noise layers for more variety
                    float combinedNoise = (cellNoise1 + cellNoise2 * 0.5) / 1.5;
                    
                    // Add time-based oscillation to create appearing/disappearing effect
                    float timeOscillation = sin(uTime * 0.5 + combinedNoise * 6.28) * 0.5 + 0.5;
                    float animatedNoise = mix(combinedNoise, timeOscillation, 0.3);
                    
                    // Create precise alpha transitions
                    float threshold = mix(uThresholdMin, uThresholdMax, 
                        sin(uTime * 0.3 + cellCoord.x + cellCoord.y) * 0.5 + 0.5);
                    
                    // Apply smooth transitions with controlled width
                    float alphaTransition = smoothstep(
                        threshold - uTransitionWidth * 0.5,
                        threshold + uTransitionWidth * 0.5,
                        animatedNoise
                    );
                    
                    // Add subtle randomness to prevent uniform patterns
                    vec2 randomSeed = floor(cellCoord) + 157.0;
                    float randomOffset = fract(sin(dot(randomSeed, vec2(12.9898, 78.233))) * 43758.5453);
                    alphaTransition *= (0.8 + randomOffset * 0.4);

                    // TODO: Fix texture on small resolutions
                    vec2 textureSize = vec2(1024.0, 1024.0);
                    vec4 diffuse = coverTexture(tTexture, textureSize, vec2(1.0 - uv.x + uTime, uv.y - uTime * 2.0) * 5.0, uResolution);

                    // Apply the controlled alpha
                    diffuse.a = alphaTransition;

                    gl_FragColor = vec4(diffuse.rgb, diffuse.a);
                }
            `,
      transparent: true,
      blending: AdditiveBlending,
      side: BackSide,
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
    uResolution.value.set(WebGLStore.viewport.width, WebGLStore.viewport.height);
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
  dispose() { }
}
