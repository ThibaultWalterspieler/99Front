import { getGPUTier } from 'detect-gpu';
import gsap from 'gsap';
import { EventDispatcher } from 'three';

// Tier list -> tier: 1 (>= 15 fps), tier: 2 (>= 30 fps), tier: 3 (>= 60 fps)
const tier = getGPUTier()

class WebGLStore extends EventDispatcher {
  #viewport
  #settings
  #state

  constructor() {
    super()

    // Check if we're on the client side
    const isClient = typeof window !== 'undefined'
    const width = isClient ? window.innerWidth : 1920
    const height = isClient ? window.innerHeight : 1080
    const dpr = isClient ? window.devicePixelRatio : 1

    this.#viewport = {
      width,
      height,
      aspect: width / height,
      dpr: gsap.utils.clamp(1, 2, dpr),
      breakpoints: {
        xl: width >= 1280,
        lg: width >= 1024,
        md: width >= 768
      }
    }

    this.#settings = {
      device: {
        tier,
        fxaa: true,
        isMobile: false
      }
    }

    this.#state = {
      previousScene: null,
      eventsEnabled: true,
      debugHidden: true
    }

    console.log(`⚙️ settings`, this.#settings);
  }

  get viewport() {
    return { ...this.#viewport }
  }

  get deviceSettings() {
    return { ...this.#settings.device }
  }

  get currentScene() {
    return this.#state.currentScene
  }

  get previousScene() {
    return this.#state.previousScene
  }

  get eventsEnabled() {
    return this.#state.eventsEnabled
  }

  setDeviceSettings({ tier, isMobile }) {
    const { device } = this.#settings
    device.tier = tier
    device.isMobile = isMobile
  }

  setEvents(value = true) {
    this.#state.eventsEnabled = value
  }

  onResize(width, height) {
    this.#viewport.width = width
    this.#viewport.height = height
    this.#viewport.aspect = width / height
    this.#viewport.breakpoints.xl = width >= 1280
    this.#viewport.breakpoints.lg = width >= 1024
    this.#viewport.breakpoints.md = width >= 768
  }
}

// eslint-disable-next-line import/no-anonymous-default-export
export default new WebGLStore()
