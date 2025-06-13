/*
Basic FBO implementation

this.position = new FBO({
  width: 128,
  height: 128,
  name: 'position',
  shader: require('./position.frag'),
  uniforms: {
	uTime: {
	  value: 0
	},
  },
});
this.position.target
this.position.update()
*/

import {
  Camera,
  DataTexture,
  FloatType,
  HalfFloatType,
  Mesh,
  MeshBasicMaterial,
  NearestFilter,
  PlaneGeometry,
  RawShaderMaterial,
  RGBAFormat,
  Scene,
  WebGLRenderTarget,
} from 'three';

import Renderer from '@99Stud/webgl/components/Renderer';
import triangle from '@99Stud/webgl/utils/primitives/triangle';

const iOS = /(iPad|iPhone|iPod)/g.test(navigator.userAgent);
const type = iOS ? HalfFloatType : FloatType;

export default class FBO {
  constructor({ width, height, data, name, shader, texture, uniforms = {}, debug = false }) {
    this.options = arguments[0];
    this.camera = new Camera();
    this.scene = new Scene();
    this.index = 0;
    this.copyData = true;
    this.texture =
      texture ||
      new DataTexture(
        data || new Float32Array(width * height * 4),
        width,
        height,
        RGBAFormat,
        type,
      );
    this.texture.needsUpdate = true;

    // Render Target
    this.rt = [this.createRT(), this.createRT()];

    this.material = new RawShaderMaterial({
      name: name || 'FBO',
      defines: {
        RESOLUTION: `vec2(${width.toFixed(1)}, ${height.toFixed(1)})`,
      },
      uniforms: {
        ...uniforms,
        texture: {
          value: this.texture,
        },
      },
      vertexShader: `precision highp float;
				attribute vec3 position;
				void main() {
				gl_Position = vec4(position, 1.0);
				}
			`,
      fragmentShader:
        shader ||
        `precision highp float;
				uniform sampler2D texture;
				void main() {
				vec2 uv = gl_FragCoord.xy / RESOLUTION.xy;
				gl_FragColor = texture2D(texture, uv);
				}
			`,
    });

    this.mesh = new Mesh(triangle, this.material);
    this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);

    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    debug && this.initDebug();
  }

  initDebug() {
    this.debugGeometry = new PlaneGeometry(1, 1);
    this.debugMaterial = new MeshBasicMaterial({ map: this.target, opacity: 1 });
    this.debugMesh = new Mesh(this.debugGeometry, this.debugMaterial);
    this.debugMesh.position.set(0, 0, 0);

    Camera.add(this.debugMesh);
  }

  createRT() {
    return new WebGLRenderTarget(
      this.options.width,
      this.options.height,
      Object.assign(
        {
          minFilter: NearestFilter,
          magFilter: NearestFilter,
          stencilBuffer: false,
          depthBuffer: false,
          depthWrite: false,
          depthTest: false,
          type,
        },
        this.options.rtOptions,
      ),
    );
  }

  get target() {
    return this.rt[this.index].texture;
  }

  get uniforms() {
    return this.material.uniforms;
  }

  onTick = (switchBack = true) => {
    const destIndex = this.index === 0 ? 1 : 0;
    const old = this.rt[this.index];
    const dest = this.rt[destIndex];

    this.material.uniforms.texture.value = this.copyData ? this.texture : old.texture;

    const oldMainTarget = Renderer.getRenderTarget();
    Renderer.setRenderTarget(dest);
    Renderer.render(this.scene, this.camera);
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    switchBack && Renderer.setRenderTarget(oldMainTarget);

    this.index = destIndex;
    this.copyData = false;
  };
}
