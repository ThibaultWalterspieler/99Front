import {
  DoubleSide,
  InstancedMesh,
  LinearFilter,
  Matrix4,
  Object3D,
  PlaneGeometry,
  ShaderMaterial,
  StaticDrawUsage,
  Vector3,
} from 'three';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';

import { sceneFolder } from '@99Stud/webgl/utils/debugger';
import { getAsset } from '@99Stud/webgl/utils/manifest/assetsLoader';

// TODO:
// - For each sampled position, generate a particle
// - Use GPGPU to calculate the particles
// - Connect particles with lines
// - Using a noise, display particles as squares
// - Depth test false on this effect

const PARAMS = {
  particles: {
    count: 100,
    showSquares: false,
  },
};

class DetectionEffect extends Object3D {
  constructor() {
    super();

    this.settings = { ...PARAMS };
    this.initialized = false;
    this.mesh = null;
    this.sampler = null;
  }

  async init() {
    if (!this.parent) return;

    // Parent needs to be an instance of Mesh
    this.sampler = new MeshSurfaceSampler(this.parent).setWeightAttribute('color').build();

    this.initialized = true;

    // this.sampleRandomPoint();

    this.createParticles();
    this.addDebug();
  }

  sampleRandomPoint() {
    if (!this.initialized) return;

    const position = new Vector3();

    this.sampler.sample(position);

    for (let i = 0; i < this.settings.particles.count; i++) {
      this.sampler.sample(position);
    }
  }

  createParticles() {
    if (!this.sampler || !this.initialized) return;

    const positions = new Float32Array(this.settings.particles.count * 3);
    const scales = new Float32Array(this.settings.particles.count);

    const tempPosition = new Vector3();
    for (let i = 0; i < this.settings.particles.count; i++) {
      this.sampler.sample(tempPosition);
      positions[i * 3] = tempPosition.x;
      positions[i * 3 + 1] = tempPosition.y;
      positions[i * 3 + 2] = tempPosition.z;

      scales[i] = Math.random() * 0.25 + 0.02;
    }

    const geometry = new PlaneGeometry(1, 1);

    const squareTexture = getAsset('tex-detection-square');
    squareTexture.minFilter = LinearFilter;
    squareTexture.magFilter = LinearFilter;

    const blueNoiseTexture = getAsset('tex-bluenoise');
    blueNoiseTexture.minFilter = LinearFilter;
    blueNoiseTexture.magFilter = LinearFilter;

    const material = new ShaderMaterial({
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vWorldPosition;

        void main() {
          vUv = uv;
          
          // Get the world position from instance matrix
          vec4 worldPosition = modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
          vWorldPosition = worldPosition.xyz;
          
          // Calculate billboard rotation to face camera
          vec3 look = normalize(cameraPosition - worldPosition.xyz);
          vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), look));
          vec3 up = cross(look, right);
          
          // Create billboard matrix
          mat3 billboardMatrix = mat3(right, up, look);
          
          // Apply billboard rotation to vertex position
          vec3 billboardPosition = billboardMatrix * position;
          
          // Get scale from instance matrix
          vec3 scale = vec3(
            length(instanceMatrix[0].xyz),
            length(instanceMatrix[1].xyz),
            length(instanceMatrix[2].xyz)
          );
          
          // Final world position with billboard rotation and scaling
          vec3 finalPosition = worldPosition.xyz + billboardPosition * scale;
          
          gl_Position = projectionMatrix * viewMatrix * vec4(finalPosition, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        varying vec2 vUv;
        varying vec3 vWorldPosition;
        uniform sampler2D tSquare;
        uniform sampler2D tBlueNoise;
        uniform float uAlphaFactor;

        void main() {

          // 1:1 texture
          vec4 square = texture2D(tSquare, vUv);

          // Use world position to sample blue noise - create unique coordinates per instance
          vec2 noiseCoord = fract(vWorldPosition.yy * 10.0 + time);
          
          // Sample blue noise texture
          float noiseValue = texture2D(tBlueNoise, noiseCoord).r;

          float threshold = 0.76;
          float alternatingAlpha = noiseValue > threshold ? 1.0 : 0.0;

          float alpha = alternatingAlpha * square.g;

          alpha *= uAlphaFactor;

          gl_FragColor = vec4(1.0, 1.0, 1.0, alpha);
        }
      `,
      uniforms: {
        time: { value: 0.0 },
        tSquare: { value: squareTexture },
        tBlueNoise: { value: blueNoiseTexture },
        uAlphaFactor: { value: this.settings.particles.showSquares ? 1.0 : 0.0 },
      },
      transparent: true,
      depthTest: false,
      depthWrite: false,
      side: DoubleSide,
    });

    const mesh = new InstancedMesh(geometry, material, this.settings.particles.count);
    mesh.frustumCulled = false;

    mesh.instanceMatrix.setUsage(StaticDrawUsage);

    const matrix = new Matrix4();
    for (let i = 0; i < this.settings.particles.count; i++) {
      matrix.identity();
      matrix.scale(new Vector3(scales[i], scales[i], 1));
      matrix.setPosition(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
      mesh.setMatrixAt(i, matrix);
    }

    mesh.instanceMatrix.needsUpdate = true;

    this.add(mesh);
    this.mesh = mesh;
  }

  addDebug() {
    const detectionFolder = sceneFolder.addFolder({ title: 'AI Detection Effect' });

    detectionFolder
      .addBinding(this.settings.particles, 'showSquares', { label: 'show squares' })
      .on('change', (ev) => {
        this.mesh.material.uniforms.uAlphaFactor.value = ev.value ? 1.0 : 0.0;
      });
  }

  onTick({ time }) {
    if (this.mesh && this.mesh.material.uniforms) {
      // Update time much less frequently to slow down the effect
      this.mesh.material.uniforms.time.value = Math.floor(time * 0.001) * 0.0001;
    }
  }
}

export default DetectionEffect;
