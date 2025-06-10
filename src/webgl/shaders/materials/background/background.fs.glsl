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

#pragma glslify: scaleUV = require(../utils/scale)
#pragma glslify: rotateUV = require(../utils/rotate)
#pragma glslify: snoise = require(../utils/optimizedSnoise)
#pragma glslify: range = require(../utils/range)

vec3 getBlueNoiseStatic(vec2 coord) {
    return texture2D(tBlueNoise, coord * uBlueNoiseTexelSize).rgb;
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


void main() {
    vec2 st = gl_FragCoord.xy / uResolution.xy;
    vec2 uv = (2.0*gl_FragCoord.xy-uResolution.xy)/uResolution.y;
    vec2 pixelUnit = 1. / uResolution.xy;
    float px = pixelUnit.y;
    vec2 shape_pos = vec2(0., .1);
    
    float scaleT = range(snoise(vec3(1., 0., uTime * .2)), 0., 1., 1., 1.4);
    float scaleRect = range(snoise(vec3(uv * 2., uTime * .2)), 0., 1., 1., 1.2);

    // Sample base gradient with higher precision sampling
    vec3 col = texture(tGrad, st).rgb;
    
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
