import Stats from 'stats-js';
import { ACESFilmicToneMapping, Color, WebGLRenderer } from 'three';

import { GlobalRaf } from '@99Stud/webgl/events';
import WebGLStore from '@99Stud/webgl/store/WebGLStore';
import tweak, { rendererFolder } from '@99Stud/webgl/utils/debugger';

class Renderer extends WebGLRenderer {
  constructor() {
    super({
      powerPreference: 'high-performance',
      antialias: true,
      depth: true,
    });

    this.toneMapping = ACESFilmicToneMapping;
    this.toneMappingExposure = 1;
    this.setClearColor(new Color('#000000'), 1);

    this.addStats();
    this.addDebug();
  }

  addStats() {
    this.stats = new Stats();
    this.stats.dom.style.position = 'relative';
    this.stats.dom.style.display = 'flex';
    this.stats.dom.style.flexDirection = 'row';
    this.stats.dom.style.justifyContent = 'flex-start';
    this.stats.dom.style.pointerEvents = 'none';

    for (const child of this.stats.dom.children) {
      child.style.display = 'inline-block';
    }
  }

  addDebug() {
    if (!rendererFolder) return;
    rendererFolder.addBinding(this.info.memory, 'geometries', {
      label: 'geometries',
      readonly: true,
    });
    rendererFolder.addBinding(this.info.memory, 'textures', { readonly: true });
    rendererFolder.addBinding(GlobalRaf, 'isPaused', { label: 'Pause Raf' });
    rendererFolder.children[rendererFolder.children.length - 1].element.after(this.stats.dom);
    window.addEventListener('keyup', (e) => {
      if (e.key !== 'p') return;
      GlobalRaf.isPaused = !GlobalRaf.isPaused;
      tweak.refresh();
    });
  }

  onResize() {
    const { width, height, dpr } = WebGLStore.viewport;

    this.setSize(width, height);
    this.setPixelRatio(dpr);
  }
}

// eslint-disable-next-line import/no-anonymous-default-export
export default new Renderer();
