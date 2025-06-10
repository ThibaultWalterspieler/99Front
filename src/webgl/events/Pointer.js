import gsap from 'gsap';

import Emitter from '@99Stud/webgl/events/Emitter';
import WebGLStore from '@99Stud/webgl/store/WebGLStore';
import { damp } from '@99Stud/webgl/utils/math';

class Pointer {
  constructor() {
    this.state = {
      current: { x: 0, y: 0 },
      target: { x: 0, y: 0 },
      normalized: { x: 0, y: 0 },
      mapped: { x: 0, y: 0 },
      ease: 0.1,
      velocity: { x: 0, y: 0 },
      speed: 0,
      speedNormalized: 0,
      isPressing: false
    }

    this.init();
  }

  init() {
    document.addEventListener('pointerdown', this.onPointerDown)
    document.addEventListener('pointermove', this.onPointerMove)
    window.addEventListener('pointerup', this.onPointerUp)
    window.addEventListener('pointerleave', this.onPointerUp)
    Emitter.on("site:tick", this.onTick);
  }

  onPointerDown = (e) => {
    const { state } = this
    state.isPressing = true

    Emitter.emit('site:pointer:down', { e, state: { pos: this.state.target, normalizedPos: this.state.normalized, mappedPos: this.state.mapped } })
  };

  onPointerMove = (e) => {
    const { viewport } = WebGLStore
    const { mapRange } = gsap.utils
    const { clientX, clientY } = e
    const { target, normalized, mapped } = this.state;

    target.x = clientX
    target.y = clientY
    normalized.x = clientX / viewport.width || 0
    normalized.y = clientY / viewport.height || 0
    mapped.x = mapRange(0, viewport.width, -1, 1, clientX);
    mapped.y = mapRange(0, viewport.height, -1, 1, clientY);
    Emitter.emit('site:pointer:move', { e, state: { pos: this.state.target, normalizedPos: this.state.normalized, mappedPos: this.state.mapped } })
  };

  onPointerUp = (e) => {
    const { state } = this
    state.isPressing = false

    Emitter.emit('site:pointer:up', { e })
  };

  onTick = ({ rafDamp }) => {
    const { viewport } = WebGLStore
    const { clamp, mapRange } = gsap.utils
    const { current, target, ease, velocity } = this.state;

    current.x = damp(current.x, target.x, ease, rafDamp);
    current.y = damp(current.y, target.y, ease, rafDamp);
    const velX = Math.round((target.x - current.x) * 100) / 100;
    const velY = Math.round((target.y - current.y) * 100) / 100;
    const mouseTravelX = Math.abs(velX);
    const mouseTravelY = Math.abs(velY);
    velocity.x = mapRange(-viewport.width / 2, viewport.width / 2, 1, -1, velX)
    velocity.y = mapRange(-viewport.height / 2, viewport.height / 2, -1, 1, velY);
    this.state.speed = Math.max(mouseTravelX, mouseTravelY);
    this.state.speedNormalized = clamp(0, 1, this.state.speed);

    if (this.state.speedNormalized > 0) {
      Emitter.emit('site:pointer:lerping', { state: this.state })
    }

  }
}

// eslint-disable-next-line import/no-anonymous-default-export
export default new Pointer();
