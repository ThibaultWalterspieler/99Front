import fragment from '@99Stud/webgl/shaders/utils/trail.glsl';

import { Emitter } from '@99Stud/webgl/events';
import FBO from '@99Stud/webgl/utils/fbo';

class Trail {
  constructor() {
    this.init();

    this.mouse = {
      velocity: { x: 0, y: 0 },
      speed: 0,
    };
    this.pointerTarget = new Vector2();
  }

  init() {
    this.fbo = new FBO({
      width: 256,
      height: 256,
      name: 'trail',
      shader: fragment,
      debug: false,
      uniforms: {
        uOpacity: { value: 0 },
        uAspect: { value: 0 },
        uPointer: { value: new Vector2() },
        uVelocity: { value: new Vector2() },
        uSize: { value: 0.09999 },
      },
    });

    Emitter.on('site:pointer:move', this.onPointerMove);
    Emitter.on('site:pointer:lerping', this.onPointerLerping);
    Emitter.on('site:resize', this.onResize);
    Emitter.on('site:tick', this.onTick);
  }

  destroy() {
    Emitter.off('site:pointer:move', this.onPointerMove);
    Emitter.off('site:pointer:lerping', this.onPointerLerping);
    Emitter.off('site:resize', this.onResize);
    Emitter.off('site:tick', this.onTick);
  }

  onPointerMove = ({ state }) => {
    const { normalizedPos } = state;
    this.pointerTarget.set(normalizedPos.x, 1 - normalizedPos.y);
  };

  onPointerLerping = ({ state }) => {
    const { speedNormalized, velocity } = state;
    const { uPointer } = this.fbo.uniforms;
    uPointer.value.copy(this.pointerTarget);
    this.mouse.speed = speedNormalized;
    this.mouse.velocity.x = velocity.x;
    this.mouse.velocity.y = velocity.y;
  };

  onTick = () => {
    const { uOpacity, uVelocity, uSize } = this.fbo.uniforms;
    uVelocity.value.x = this.mouse.velocity.x;
    uVelocity.value.y = this.mouse.velocity.y;
    uOpacity.value = this.mouse.speed;
    uSize.value = Math.abs(this.mouse.speed - 1) * 0.09999;
    this.fbo.onTick();
  };

  onResize = () => {
    const { viewport } = store;
    const { uAspect } = this.fbo.uniforms;
    uAspect.value = viewport.aspect;
  };
}

// eslint-disable-next-line import/no-anonymous-default-export
export default new Trail();
