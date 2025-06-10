import { gsap } from 'gsap';

import Emitter from '@99Stud/webgl/events/Emitter';
import WebGLStore from '@99Stud/webgl/store/WebGLStore';

class Resize {
  constructor() {
    // Only initialize on client side
    if (typeof window !== 'undefined') {
      this.init();
    }
  }

  init() {
    this.onResize()
    window.addEventListener('resize', this.onResize)
  }

  onResize = () => {
    // Only run on client side
    if (typeof window === 'undefined') return

    const { viewport } = WebGLStore;

    viewport.width = window.innerWidth
    viewport.height = window.innerHeight
    viewport.aspect = window.innerWidth / window.innerHeight
    viewport.dpr = gsap.utils.clamp(1, 2, window.devicePixelRatio)

    Emitter.emit('site:resize', {})
  };
}

// eslint-disable-next-line import/no-anonymous-default-export
export default new Resize();
