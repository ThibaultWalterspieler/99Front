import { PerspectiveCamera, Vector3 } from 'three'
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import Renderer from './Renderer'
import WebGLStore from '@/js/store/WebGLStore'

class Camera extends PerspectiveCamera {
  constructor() {
    super(55, 0, 0.1, 100);
    this.onResize()
  }

  init() {
    this.position.set(0, 0, 10);
    this.lookPos = new Vector3(0, 0, 0); 
    this.fov = 20
    this.initOrbitControl()
    this.lookAt(this.lookPos);
    this.controls.target = this.lookPos
  }

  initOrbitControl() {
    this.controls = new OrbitControls(this, Renderer.domElement);
    this.controls.enabled = false;
  }

  calculateUnitSize(distance = this.position.z) {
    const vFov = this.fov * Math.PI / 180;
    const height = 2 * Math.tan(vFov / 2) * distance;
    const width = height * this.aspect;

    return {
      width,
      height 
    };
  }

  onTick() {
    this.controls.update()
  }

  onResize() {
    const {viewport} = WebGLStore

    this.aspect = viewport.aspect;
    this.unit = this.calculateUnitSize()
    this.updateProjectionMatrix();
  }
}

// eslint-disable-next-line import/no-anonymous-default-export
export default new Camera();