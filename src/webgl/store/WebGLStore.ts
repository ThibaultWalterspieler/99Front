import { getGPUTier } from 'detect-gpu';
import gsap from 'gsap';
import { EventDispatcher } from 'three';

const tier = getGPUTier();

interface Viewport {
  width: number;
  height: number;
  aspect: number;
  dpr: number;
  breakpoints: {
    xl: boolean;
    lg: boolean;
    md: boolean;
  };
}

interface DeviceSettings {
  tier: unknown;
  fxaa: boolean;
  isMobile: boolean;
}

interface State {
  currentScene?: unknown;
  previousScene: unknown;
  eventsEnabled: boolean;
  debugHidden: boolean;
}

class WebGLStore extends EventDispatcher {
  #viewport: Viewport;
  #settings: { device: DeviceSettings };
  #state: State;

  constructor() {
    super();

    const isClient = typeof window !== 'undefined';
    const width = isClient ? window.innerWidth : 1920;
    const height = isClient ? window.innerHeight : 1080;
    const dpr = isClient ? window.devicePixelRatio : 1;

    this.#viewport = {
      width,
      height,
      aspect: width / height,
      dpr: gsap.utils.clamp(1, 2, dpr),
      breakpoints: {
        xl: width >= 1280,
        lg: width >= 1024,
        md: width >= 768,
      },
    };

    this.#settings = {
      device: {
        tier,
        fxaa: true,
        isMobile: false,
      },
    };

    this.#state = {
      currentScene: undefined,
      previousScene: null,
      eventsEnabled: true,
      debugHidden: true,
    };
  }

  get viewport(): Viewport {
    return { ...this.#viewport };
  }

  get deviceSettings(): DeviceSettings {
    return { ...this.#settings.device };
  }

  get currentScene(): unknown {
    return this.#state.currentScene;
  }

  get previousScene(): unknown {
    return this.#state.previousScene;
  }

  get eventsEnabled(): boolean {
    return this.#state.eventsEnabled;
  }

  setDeviceSettings({ tier, isMobile }: { tier: unknown; isMobile: boolean }): void {
    const { device } = this.#settings;
    device.tier = tier;
    device.isMobile = isMobile;
  }

  setEvents(value: boolean = true): void {
    this.#state.eventsEnabled = value;
  }

  onResize(width: number, height: number): void {
    this.#viewport.width = width;
    this.#viewport.height = height;
    this.#viewport.aspect = width / height;

    this.#viewport.breakpoints.xl = width >= 1280;
    this.#viewport.breakpoints.lg = width >= 1024;
    this.#viewport.breakpoints.md = width >= 768;
  }
}

const webglStore = new WebGLStore();

export default webglStore;
