import { gsap } from 'gsap';
import WebGLStore from '../store/WebGLStore';
import Emitter from "./Emitter";

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
