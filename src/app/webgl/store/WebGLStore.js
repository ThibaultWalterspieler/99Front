import gsap from 'gsap'
import { EventDispatcher } from 'three'
import { getGPUTier } from 'detect-gpu';

// Tier list -> tier: 1 (>= 15 fps), tier: 2 (>= 30 fps), tier: 3 (>= 60 fps)
const tier = getGPUTier()

class WebGLStore extends EventDispatcher {
  #viewport
  #settings
  #state

  constructor () {
    super()

    this.#viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
      aspect: window.innerWidth / window.innerHeight,
      dpr: gsap.utils.clamp(1, 2, window.devicePixelRatio),
      breakpoints: {
        xl: false,
        lg: false,
        md: false
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

  setDeviceSettings ({ tier, isMobile }) {
    const { device } = this.#settings
    device.tier = tier
    device.isMobile = isMobile
  }

  setEvents (value = true) {
    this.#state.eventsEnabled = value
  }

  onResize (width, height) {
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
