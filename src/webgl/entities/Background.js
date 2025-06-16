import { BACKGROUND_PARAMS } from '@99Stud/webgl/store/constants';
import {
  BackSide,
  Color,
  Mesh,
  Object3D,
  ShaderMaterial,
  SphereGeometry,
  Vector2,
  Vector3,
} from 'three';
import { degToRad } from 'three/src/math/MathUtils.js';

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
    const material = new ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        tGrad: { value: getAsset('tex-gradient') },
        tBlueNoise: { value: getAsset('tex-bluenoise') },
        uResolution: { value: new Vector3() },
        uColorInner: { value: new Color(this.settings.colorInner).convertLinearToSRGB() },
        uColorMid: { value: new Color(this.settings.colorMid).convertLinearToSRGB() },
        uColorOuter: { value: new Color(this.settings.colorOuter).convertLinearToSRGB() },
        uScale: { value: 0 },
        uGradientScale1: { value: this.settings.gradientScale1 },
        uGradientScale2: { value: this.settings.gradientScale2 },
        uGradientScale3: { value: this.settings.gradientScale3 },
        uGradientSpeed: { value: this.settings.gradientSpeed },
        uBlurriness: { value: this.settings.blurriness },
        uBlueNoiseTexelSize: { value: new Vector2(1 / 8, 1 / 8) },
        uBlueNoiseCoordOffset: { value: new Vector2(0, 0) },
      },
      vertexShader: `
                varying vec4 vMvPos;
                varying vec3 vWorldPos;
                varying vec3 vViewDirection;
                varying vec2 vUv;

                void main() {
                    vec3 worldPos = (modelMatrix * vec4(position, 1.0)).xyz;
                    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
                    gl_Position = projectionMatrix * mvPos;

                    vMvPos = mvPos;
                    vWorldPos = worldPos;
                    vViewDirection = normalize(cameraPosition - worldPos);
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
                uniform vec2 uBlueNoiseTexelSize;
                uniform vec2 uBlueNoiseCoordOffset;
                uniform float uScale;
                uniform float uBlurriness;
                uniform float uGradientScale1;
                uniform float uGradientScale2;
                uniform float uGradientScale3;
                uniform float uGradientSpeed;

                varying vec4 vMvPos;
                varying vec3 vWorldPos;
                varying vec3 vViewDirection;
                varying vec2 vUv;

                #define PI 3.14159265

                vec3 getBlueNoiseStatic(vec2 coord) {
                    return texture2D(tBlueNoise, coord * uBlueNoiseTexelSize).rgb;
                }

                float range(float oldValue, float oldMin, float oldMax, float newMin, float newMax) {
                    vec3 sub = vec3(oldValue, newMax, oldMax) - vec3(oldMin, newMin, oldMin);
                    return sub.x * sub.y / sub.z + newMin;
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


                float SDF_rounded_box( in vec2 p, in vec2 b, in vec4 r )
                {
                    r.xy = (p.x>0.0)?r.xy : r.zw;
                    r.x  = (p.y>0.0)?r.x  : r.y;
                    vec2 q = abs(p)-b+r.x;
                    return min(max(q.x,q.y),0.0) + length(max(q,0.0)) - r.x;
                }

                float SDF_Circle( vec2 p, float r ) { return length(p) - r; }


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

                vec2 scaleUV(vec2 uv, vec2 scale, vec2 origin) {
                    vec2 st = uv - origin;
                    st /= scale;
                    return st + origin;
                }

                vec2 rotateUV(vec2 uv, float rotation, vec2 mid) {
                    float cosAngle = cos(rotation);
                    float sinAngle = sin(rotation);
                    return vec2(
                        cosAngle * (uv.x - mid.x) + sinAngle * (uv.y - mid.y) + mid.x,
                        cosAngle * (uv.y - mid.y) - sinAngle * (uv.x - mid.x) + mid.y
                    );
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
                    float px = pixelUnit.y;
                    vec2 shape_pos = vec2(0., .1);
                    
                    float scaleT = range(snoise(vec3(1., 0., uTime * .2)), 0., 1., 1., 1.4);
                    float scaleRect = range(snoise(vec3(uv * 2., uTime * .2)), 0., 1., 1., 1.2);

                    // Sample base gradient with higher precision sampling
                    vec3 col = coverTexture(tGrad, vec2(1920., 1080.), st, uResolution.xy).rgb;
                    
                    // Apply blur more carefully to preserve gradient smoothness
                    vec4 blurred = blur(tGrad, st, vec2(1.0, 1.0) * uBlurriness);
                    col = mix(col, blurred.rgb, 1.0);

                    // Strong temporal + spatial dithering
                    vec3 spatialDither = getBlueNoiseStatic(gl_FragCoord.xy) - 0.5;
                    vec3 temporalDither = getBlueNoiseStatic(gl_FragCoord.xy + uTime * 1000.0) - 0.5;
                    vec3 combinedDither = (spatialDither + temporalDither * 0.5) * (10.0/255.0);
                    
                    // Apply strong dithering early
                    col += combinedDither;
                    
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
                    
                    // Final aggressive dithering to break any remaining quantization
                    col += combinedDither * 1.5;
                    
                    // Additional high-frequency dithering
                    float highFreqDither = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
                    col += vec3(highFreqDither * (0.5/255.0));
                    
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
      .addBinding(this.settings, 'blurriness', { min: 0, max: 1, step: 0.01 })
      .on('change', (ev) => {
        this.mesh.material.uniforms.uBlurriness.value = ev.value;
      });

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
      this.mesh.material.uniforms.uColorInner.value = new Color(ev.value).convertLinearToSRGB();
    });

    folder.addBinding(this.settings, 'colorMid', { view: 'color' }).on('change', (ev) => {
      this.mesh.material.uniforms.uColorMid.value = new Color(ev.value).convertLinearToSRGB();
    });

    folder.addBinding(this.settings, 'colorOuter', { view: 'color' }).on('change', (ev) => {
      this.mesh.material.uniforms.uColorOuter.value = new Color(ev.value).convertLinearToSRGB();
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
