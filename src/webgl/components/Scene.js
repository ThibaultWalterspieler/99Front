import { Color, DirectionalLight, Scene } from 'three';
import { degToRad } from 'three/src/math/MathUtils.js';

import Camera from '@99Stud/webgl/components/Camera';
import Background from '@99Stud/webgl/entities/Background';
import Coin from '@99Stud/webgl/entities/Coin';
import { sceneFolder } from '@99Stud/webgl/utils/debugger';
import { getAsset } from '@99Stud/webgl/utils/manifest/assetsLoader';

const PARAMS = {
  envIntensity: 1.0,
  envRotation: {
    x: -20,
    y: 180,
    z: -40,
  },
};

class Stage extends Scene {
  init() {
    this.background = new Color(0x000000);
    this.add(Camera);

    const envMap = getAsset('hdr-studio_2k_1');
    this.environment = envMap;

    this.environmentIntensity = 0.4;
    this.environmentRotation.y = degToRad(PARAMS.envRotation.y);
    this.environmentRotation.x = degToRad(PARAMS.envRotation.x);
    this.environmentRotation.z = degToRad(PARAMS.envRotation.z);

    this.coin = new Coin();
    this.add(this.coin);

    // TODO: fix textures
    // if (!WebGLStore.deviceSettings.isMobile || !WebGLStore.viewport.breakpoints.md) {
    //   // this.tunnel = new TextureTunnel();
    //   // this.add(this.tunnel);
    // }

    this.background = new Background();
    this.add(this.background);

    this.light = new DirectionalLight(0xffffff, 0.5);
    this.light.position.set(4, 3, 10);
    this.add(this.light);

    this.addDebug();
  }

  addDebug() {
    if (!sceneFolder) return;
    const envFolder = sceneFolder.addFolder({ title: 'Environment' });
    envFolder.addBinding(PARAMS, 'envIntensity').on('change', (ev) => {
      this.environmentIntensity = ev.value;
    });
    envFolder.addBinding(PARAMS, 'envRotation').on('change', (ev) => {
      this.environmentRotation.set(
        degToRad(ev.value.x),
        degToRad(ev.value.y),
        degToRad(ev.value.z),
      );
    });
  }

  onTick({ time, delta, rafDamp }) {
    for (const child of this.children) {
      child.onTick?.({ time, delta, rafDamp });
    }
  }

  onResize() {
    for (const child of this.children) {
      child.onResize?.();
    }
  }
}

// eslint-disable-next-line import/no-anonymous-default-export
export default new Stage();
