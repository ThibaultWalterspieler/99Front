import { PerspectiveCamera, Vector3 } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import Renderer from '@99Stud/webgl/components/Renderer';
import { CONTROLS_ENABLED } from '@99Stud/webgl/store/constants';
import WebGLStore from '@99Stud/webgl/store/WebGLStore';

interface UnitSize {
  width: number;
  height: number;
}

class Camera extends PerspectiveCamera {
  controls!: OrbitControls;
  lookPos!: Vector3;
  unit!: UnitSize;

  constructor() {
    super(55, 0, 0.1, 100);
    this.onResize();
  }

  init(): void {
    this.position.set(0, 0, 10);
    this.lookPos = new Vector3(0, 0, 0);
    this.fov = 20;
    this.initOrbitControl();
    this.lookAt(this.lookPos);
    this.controls.target = this.lookPos;
  }

  initOrbitControl(): void {
    this.controls = new OrbitControls(this, Renderer.domElement);
    this.controls.enabled = CONTROLS_ENABLED;
  }

  calculateUnitSize(distance: number = this.position.z): UnitSize {
    const vFov = (this.fov * Math.PI) / 180;
    const height = 2 * Math.tan(vFov / 2) * distance;
    const width = height * this.aspect;

    return {
      width,
      height,
    };
  }

  onTick(): void {
    if (CONTROLS_ENABLED) {
      this.controls.update();
    }
  }

  onResize(): void {
    const { viewport } = WebGLStore;

    this.aspect = viewport.aspect;
    this.unit = this.calculateUnitSize();
    this.updateProjectionMatrix();
  }
}

const camera = new Camera();

export default camera;
