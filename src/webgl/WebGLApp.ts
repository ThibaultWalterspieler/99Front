import { DEBUG_ENABLED } from '@99Stud/webgl/store/constants';
import { ThreePerf } from 'three-perf';

import Camera from '@99Stud/webgl/components/Camera';
import Renderer from '@99Stud/webgl/components/Renderer';
import Scene from '@99Stud/webgl/components/Scene';
import { Emitter } from '@99Stud/webgl/events';

const isBrowser = typeof window !== 'undefined';
const isDev = process.env.NODE_ENV === 'development';

export default class WebGLApp {
  private wrapper?: HTMLElement;
  private perf?: ThreePerf;

  init(wrapper: HTMLElement): void {
    if (!wrapper || !isBrowser) return;
    this.wrapper = wrapper;
    this.wrapper.appendChild(Renderer.domElement);

    Camera.init();
    Scene.init();

    if (isDev && DEBUG_ENABLED) this.setupPerfs();

    this.setupEvents();
    this.onResize();
  }

  setupPerfs(): void {
    if (!this.wrapper) return;
    this.perf = new ThreePerf({
      anchorX: 'left',
      anchorY: 'top',
      domElement: this.wrapper,
      renderer: Renderer,
    });
  }

  setupEvents(): void {
    Emitter.on('site:tick', this.onTick);

    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (!this.perf) return;
      let toggle = false;
      if (e.key === 'p') {
        toggle = !this.perf.visible;
        this.perf.visible = toggle;
      }
    });
  }

  onTick = ({ time, delta, rafDamp }: { time: number; delta: number; rafDamp: number }): void => {
    Scene?.onTick?.({ time, delta, rafDamp });
    Camera?.onTick?.();

    this.perf?.begin?.();

    Renderer?.render?.(Scene, Camera);

    this.perf?.end?.();

    Renderer?.stats?.update?.();
  };

  onResize = (): void => {
    Scene?.onResize?.();
    Camera?.onResize?.();

    Renderer?.onResize?.();
  };
}
