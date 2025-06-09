import { ACESFilmicToneMapping, Color, WebGLRenderer } from 'three';
import WebGLStore from '../store/WebGLStore'

class Renderer extends WebGLRenderer {
  constructor() {
    super({
      powerPreference: 'high-performance',
      antialias: true,
      depth: true,
    })

    this.toneMapping = ACESFilmicToneMapping
    this.toneMappingExposure = 1
    this.setClearColor(new Color('#000000'), 1)
  }

  onResize() {
    const {width, height, dpr} = WebGLStore.viewport

    this.setSize(width, height);
    this.setPixelRatio(dpr);
  }
}

// eslint-disable-next-line import/no-anonymous-default-export
export default new Renderer()