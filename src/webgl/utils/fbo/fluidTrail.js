import { Vector2 } from 'three';

import Renderer from '@99Stud/webgl/components/Renderer';
import { Emitter } from '@99Stud/webgl/events';
import WebGLStore from '@99Stud/webgl/store/WebGLStore';
import { Fluid } from '@99Stud/webgl/utils/fbo/fluid';

// https://github.com/alienkitty/alien.js/blob/main/examples/three/shader_fluid_distortion.html

class FluidTrail {
  constructor() {
    this.init();
    this.lastMouse = new Vector2();
  }

  init() {
    this.fbo = new Fluid(Renderer, {
      simRes: 512,
      dyeRes: 512,
      iterations: 1,
      curlStrength: -20,
      velocityDissipation: 0.98,
      // pressureDissipation: 0.999,
      // densityDissipation: 0.85,
      radius: 0.05,
    });

    // simRes: 128,
    // dyeRes: 512,
    // iterations: 3,
    // densityDissipation: 0.97,
    // velocityDissipation: 0.98,
    // pressureDissipation: 0.8,
    // curlStrength: 20,
    // radius: 0.2

    Emitter.on('site:pointer:move', this.onPointerMove);
    Emitter.on('site:resize', this.onResize);
    Emitter.on('site:tick', this.onTick);
  }

  destroy() {
    Emitter.off('site:pointer:move', this.onPointerMove);
    Emitter.off('site:resize', this.onResize);
    Emitter.off('site:tick', this.onTick);
    this.fbo.dispose();
  }

  onPointerMove = ({ state }) => {
    const { viewport } = WebGLStore;
    const { pos } = state;

    // First input
    if (!this.lastMouse.isInit) {
      this.lastMouse.isInit = true;
      this.lastMouse.copy(pos);
    }

    const deltaX = pos.x - this.lastMouse.x;
    const deltaY = pos.y - this.lastMouse.y;

    this.lastMouse.copy(pos);

    // Add if the mouse is moving
    if (Math.abs(deltaX) || Math.abs(deltaY)) {
      // Update fluid simulation inputs
      this.fbo.splats.push({
        // Get mouse value in 0 to 1 range, with Y flipped
        x: pos.x / viewport.width,
        y: 1 - pos.y / viewport.height,
        dx: deltaX * 5,
        dy: deltaY * -5,
        color: [1, 1, 1], // Pure white color
      });
    }
  };

  onTick = () => {
    this.fbo.update();
  };

  onResize = () => {
    const { viewport } = WebGLStore;
    const { uAspect } = this.fbo.splatMaterial.uniforms;
    uAspect.value = viewport.aspect;
  };
}

// eslint-disable-next-line import/no-anonymous-default-export
export default new FluidTrail();
