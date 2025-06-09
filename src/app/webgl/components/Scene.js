import { Color, Scene, DirectionalLight } from 'three';
import Camera from '@/js/webgl/components/Camera';
import {getAsset} from '@/js/utils/assetsLoader'
import { sceneFolder } from '@/js/utils/debugger'
import { degToRad } from 'three/src/math/MathUtils.js';

import Coin from '../entities/Coin';
import Background from '../entities/Background';

const PARAMS = {
  envIntensity: 1.0,
  envRotation: {
    x: -20,
    y: 180,
    z: -40
  }
}

class Stage extends Scene {
  init() {
    this.background = new Color(0x000000)
    this.add(Camera)

    const envMap = getAsset('hdr-studio_2k_1')
    this.environment = envMap

    this.environmentIntensity = 0.4
    this.environmentRotation.y = degToRad(PARAMS.envRotation.y)
    this.environmentRotation.x = degToRad(PARAMS.envRotation.x)
    this.environmentRotation.z = degToRad(PARAMS.envRotation.z)

    this.coin = new Coin()
    this.add(this.coin)

    this.background = new Background()
    this.add(this.background)

    this.light = new DirectionalLight(0xffffff, 0.5)
    this.light.position.set(4, 3, 10)
    this.add(this.light)

    this.addDebug()
  }

  addDebug() {
    const envFolder = sceneFolder.addFolder({title: 'Environment'})
    envFolder.addBinding(PARAMS, 'envIntensity').on('change', (ev) => { this.environmentIntensity = ev.value })
    envFolder.addBinding(PARAMS, 'envRotation').on('change', (ev) => { this.environmentRotation.set(degToRad(ev.value.x), degToRad(ev.value.y), degToRad(ev.value.z)) })
  }

  onTick ({time, delta, rafDamp}) {
    for (const child of this.children) {
      child.onTick?.({time, delta, rafDamp})
    }
  }

  onResize () {
    for (const child of this.children) {
      child.onResize?.()
    }
  }
}

// eslint-disable-next-line import/no-anonymous-default-export
export default new Stage();