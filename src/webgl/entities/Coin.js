import gsap from 'gsap';
import {
  AdditiveBlending,
  Color,
  FrontSide,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Vector2,
  Vector3,
} from 'three';
import { degToRad } from 'three/src/math/MathUtils.js';

import { CustomDrag } from '@99Stud/webgl/components/CustomDrag';
import { GlobalPointer } from '@99Stud/webgl/events';
import { COIN_PARAMS } from '@99Stud/webgl/store/constants';
import WebGLStore from '@99Stud/webgl/store/WebGLStore';
import { sceneFolder } from '@99Stud/webgl/utils/debugger';
import { getAsset } from '@99Stud/webgl/utils/manifest/assetsLoader';

export default class Coin extends Object3D {
  constructor(options) {
    super(options);

    this.name = options?.name ? `Coin-${options.name}` : `Coin`;
    this.settings = { ...COIN_PARAMS, ...options?.settings };

    this.baseScale = 5;
    this.baseRotation = 0;
    this.responsiveScale = !WebGLStore.viewport.breakpoints.md
      ? this.baseScale * (WebGLStore.viewport.width / 650)
      : this.baseScale;

    this.rotation.set(degToRad(90), degToRad(90), degToRad(90));
    this.position.set(!WebGLStore.deviceSettings.isMobile ? 0.05 : 0, 0, 0);
    this.scale.setScalar(0);

    this.hasTransitionedIn = false;

    this.init();
    this.setupTweens();
    this.setupDrag();
    this.addDebug();
    this.onResize();
  }

  async init() {
    const { scene } = getAsset('coin-optimized');

    const metallicMap = getAsset('ktx2-metalness');
    const normalMap = getAsset('tex-normal');
    const roughnessMap = getAsset('ktx2-roughness');
    const lightMap = getAsset('ktx2-lightmap');
    const aoMap = getAsset('ktx2-aomap');

    this.coin = scene.children.find(
      (child) => child instanceof Mesh && child.name === 'Rabbit_coin',
    );
    this.coin.geometry.center();

    this.coin.position.set(0, 0, 0);
    this.coin.scale.setScalar(this.settings.scale);
    this.face = this.settings.faces[0];

    this.uniforms = {
      uTime: { value: 0 },
      uResolution: { value: new Vector2(WebGLStore.viewport.width, WebGLStore.viewport.height) },
    };

    this.material = new MeshStandardMaterial({
      color: new Color(COIN_PARAMS.color),
      roughness: COIN_PARAMS.roughness,
      metalness: COIN_PARAMS.metalness,
      metalnessMap: metallicMap,
      normalMap: normalMap,
      roughnessMap: roughnessMap,
      aoMap: aoMap,
      aoMapIntensity: 1,
      lightMap: lightMap,
      lightMapIntensity: 1,
      side: FrontSide,
    });

    if (this.settings.scanlineEnabled) {
      this.material.onBeforeCompile = (shader) => {
        shader.uniforms = Object.assign(shader.uniforms, this.uniforms);

        shader.vertexShader = shader.vertexShader.replace(
          '#include <common>',
          `
                #include <common>
                varying vec2 vUv;
                `,
        );

        shader.vertexShader = shader.vertexShader.replace(
          '#include <project_vertex>',
          `
                #include <project_vertex>
                vUv = uv;
                `,
        );

        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <common>',
          `
                #include <common>
                uniform float uTime;
                uniform vec2 uResolution;
                varying vec2 vUv;


                const vec3 scanlineColorInner = vec3(1.0, 1.0, 1.0);
                const vec3 scanlineColorOuter = vec3(1.0, 0.0, 0.0);
                const float scanlineSpacing = 30.0;
                const float scanlineThickness = 0.01;
                const float scanlineIntensity = 2.0;
                `,
        );

        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <color_fragment>',
          `#include <color_fragment>

                // Flat projection on the model UVs
                vec2 st = vUv;
                vec2 uv = (2.0*gl_FragCoord.xy-uResolution.xy)/uResolution.y;

                // Calculate scanline effect
                float scanPos = st.y * scanlineSpacing - uTime;
                float scanline = sin(scanPos * 3.14159);
                
                // Apply thickness control
                scanline = smoothstep(1.0 - scanlineThickness, 1.0, scanline);
                
                // // Apply intensity and color
                // vec3 scanlineEffect = scanlineColorInner * scanline * scanlineIntensity;

                // Apply color threshold Inner / Outer on the lines

                float scanlineOuter = sin(scanPos * 3.14159);
                scanlineOuter = smoothstep(0.99 - scanlineThickness, 0.99, scanlineOuter);

                // Fading out inner lines
                float scanlineInner = sin(scanPos * 3.14159) * scanlineOuter;
                scanlineInner = smoothstep(0.999 - scanlineThickness / 10.0, 0.999, scanlineInner);
                scanlineInner = scanlineInner * scanlineOuter;

                vec3 scanlineEffectInner = scanlineColorInner * scanlineInner * scanlineIntensity;
                vec3 scanlineEffectOuter = scanlineColorOuter * scanlineOuter * scanlineIntensity;

                // Add the colored scanline effect to the final color
                diffuseColor.rgb += scanlineEffectInner + scanlineEffectOuter;`,
        );

        shader.blending = AdditiveBlending;
      };
    }

    this.coin.material = this.material;

    this.coin.position.set(
      this.settings.position.x,
      this.settings.position.y,
      this.settings.position.z,
    );
    this.coin.rotation.set(
      degToRad(this.settings.savedRotations.recto.x),
      degToRad(this.settings.savedRotations.y),
      degToRad(this.settings.savedRotations.recto.z),
    );
    this.add(this.coin);

    await this.transitionIn();
  }

  async transitionIn() {
    const tlIn = gsap.timeline();
    const duration = 2;

    tlIn.to(this.scale, {
      x: this.responsiveScale,
      y: this.responsiveScale,
      z: this.responsiveScale,
      duration: duration,
      ease: 'elastic.out(1, 0.9)',
    });

    tlIn.to(
      this.rotation,
      {
        x: degToRad(this.baseRotation),
        y: degToRad(this.baseRotation),
        z: degToRad(this.baseRotation),
        duration: duration,
        ease: 'elastic.out(1, 0.9)',
      },
      '<',
    );

    tlIn.eventCallback('onComplete', () => {
      this.hasTransitionedIn = true;
    });
  }

  setupTweens() {
    // Create tweens after coin is initialized
    this.dragRotationTween = gsap.to(this.coin.rotation, {
      duration: 0.1,
      ease: 'spring(1, 0.8, 10, 0.8)',
      paused: true,
    });

    this.returnRotationTween = gsap.to(this.coin.rotation, {
      x: degToRad(this.settings.savedRotations.recto.x),
      y: degToRad(this.settings.savedRotations.y),
      z: degToRad(this.settings.savedRotations.recto.z),
      duration: 1.0,
      ease: 'elastic.out(1, 0.99)',
      paused: true,
    });
  }

  setupDrag() {
    if (!this.settings.dragEnabled) return;

    this.drag = new CustomDrag(this.coin, {
      name: 'coin-drag',
      settings: {
        axis: this.settings.dragAxis,
        speed: this.settings.dragSpeed,
        damping: this.settings.dragDamping,
        usePlane: true,
        bounds: {
          min: new Vector3(0, 0, 0),
          max: new Vector3(0, 0, 0),
        },
      },
      onDragStart: this.onDragStart,
      onDrag: this.onDrag,
      onDragEnd: this.onDragEnd,
    });
  }

  // TODO:
  // - Debounce onDragStart and onDragEnd to prevent multiple calls and glitches
  // - Based on the direction lerp the values accordingly in order to prevent multiple 360° rotations

  onDragStart = async () => {
    const targetScale =
      WebGLStore.deviceSettings.isMobile || !WebGLStore.viewport.breakpoints.md
        ? this.settings.scale * 1.2
        : this.settings.scale * 1.05;

    this.initialRotationY = this.coin.rotation.y;

    this.returnRotationTween.kill();

    await gsap.to(this.coin.scale, {
      x: targetScale,
      y: targetScale,
      z: targetScale,
      duration: 1.0,
      ease: 'expo.inOut',
    });
  };

  onDrag = ({ distance }) => {
    const mappedRotation = gsap.utils.mapRange(
      -1,
      1,
      -60,
      60,
      distance.x * this.settings.dragSpeed,
    );
    const targetRotation = Math.max(
      Math.min(degToRad(mappedRotation), degToRad(60)),
      degToRad(-60),
    );

    this.dragRotationTween.vars.y = this.initialRotationY + targetRotation;
    this.dragRotationTween.invalidate().restart();
  };

  onDragEnd = async ({ direction, distance }) => {
    const targetScale = this.settings.scale;

    this.dragRotationTween.kill();

    // If distance is passed a certain threshold (-0.5 / 0.5) flip the coin
    if (distance.x > this.settings.flipThreshold || distance.x <= -this.settings.flipThreshold) {
      this.face =
        this.face === this.settings.faces[0] ? this.settings.faces[1] : this.settings.faces[0];

      const rotationOffset = direction.horizontal === 'right' ? 180 : -180;
      this.settings.savedRotations.y = this.settings.savedRotations.y + rotationOffset;
    }

    const targetRotations = this.settings.savedRotations[this.face.toLowerCase()];

    this.returnRotationTween.vars.x = degToRad(targetRotations.x);
    this.returnRotationTween.vars.y = degToRad(this.settings.savedRotations.y);
    this.returnRotationTween.vars.z = degToRad(targetRotations.z);

    this.returnRotationTween.invalidate().restart(true);

    await gsap.to(this.coin.scale, {
      x: targetScale,
      y: targetScale,
      z: targetScale,
      duration: 1.0,
      ease: 'expo.inOut',
      onComplete: () => {
        gsap.killTweensOf(this.coin.scale);
      },
    });
  };

  addDebug() {
    if (!sceneFolder) return;
    const coinFolder = sceneFolder.addFolder({ title: 'Coin' });
    coinFolder.addBinding(COIN_PARAMS, 'color').on('change', (ev) => {
      this.material.color.set(ev.value);
    });
    coinFolder.addBinding(COIN_PARAMS, 'roughness').on('change', (ev) => {
      this.material.roughness = ev.value;
    });
    coinFolder.addBinding(COIN_PARAMS, 'metalness').on('change', (ev) => {
      this.material.metalness = ev.value;
    });
    coinFolder.addBinding(COIN_PARAMS.position, 'x', { min: -5, max: 5 }).on('change', (ev) => {
      this.position.x = ev.value;
    });
    coinFolder.addBinding(COIN_PARAMS.position, 'y', { min: -5, max: 5 }).on('change', (ev) => {
      this.position.y = ev.value;
    });
    coinFolder.addBinding(COIN_PARAMS.position, 'z', { min: -5, max: 5 }).on('change', (ev) => {
      this.position.z = ev.value;
    });
    coinFolder
      .addBinding(COIN_PARAMS.savedRotations.recto, 'x', { min: -180, max: 180 })
      .on('change', (ev) => {
        this.coin.rotation.x = degToRad(ev.value);
      });
    coinFolder
      .addBinding(COIN_PARAMS.savedRotations, 'y', { min: -180, max: 180 })
      .on('change', (ev) => {
        this.coin.rotation.y = degToRad(ev.value);
      });
    coinFolder
      .addBinding(COIN_PARAMS.savedRotations.recto, 'z', { min: -180, max: 180 })
      .on('change', (ev) => {
        this.coin.rotation.z = degToRad(ev.value);
      });

    if (this.drag) {
      const dragFolder = coinFolder.addFolder({ title: 'Drag' });
      dragFolder.addBinding(COIN_PARAMS, 'dragEnabled').on('change', (ev) => {
        if (ev.value) {
          this.drag.enable();
        } else {
          this.drag.disable();
        }
      });
      dragFolder
        .addBinding(COIN_PARAMS, 'dragAxis', { options: { xy: 'xy', x: 'x', y: 'y' } })
        .on('change', (ev) => {
          this.drag.setAxis(ev.value);
        });
      dragFolder
        .addBinding(COIN_PARAMS, 'dragSpeed', { min: 0.001, max: 0.1 })
        .on('change', (ev) => {
          this.drag.settings.speed = ev.value;
        });
      dragFolder.addBinding(COIN_PARAMS, 'dragDamping', { min: 0, max: 0.5 }).on('change', (ev) => {
        this.drag.settings.damping = ev.value;
      });
    }

    if (this.settings.scanlineEnabled && this.uniforms) {
      coinFolder
        .addBinding(this.uniforms.uTime, 'value', { label: 'Scanline Time', min: 0, max: 10 })
        .on('change', (ev) => {
          this.uniforms.uTime.value = ev.value;
        });
    }
  }

  onTick({ time, rafDamp }) {
    if (
      !this.settings.debugPointer &&
      !this.drag?.state?.isDragging &&
      WebGLStore.viewport.breakpoints.md
    ) {
      this.coin.rotation.y += -GlobalPointer.state.velocity.x * (0.01 * rafDamp);
      this.coin.rotation.x += GlobalPointer.state.velocity.y * (0.01 * rafDamp);
    }

    if (!WebGLStore.viewport.breakpoints.md) {
      this.coin.position.y = Math.sin(time * 1.2) * 0.01;
    } else {
      this.coin.position.y = Math.sin(time * 1.2) * 0.005;
    }

    this.uniforms.uTime.value += 0.01 * rafDamp;
  }

  onResize() {
    const { width, height, dpr } = WebGLStore.viewport;
    const { uResolution } = this.uniforms;
    uResolution.value.set(width * dpr, height * dpr, dpr);

    if (!WebGLStore.viewport.breakpoints.md) {
      this.responsiveScale = this.baseScale * (WebGLStore.viewport.width / 800);

      if (this.hasTransitionedIn) {
        this.scale.setScalar(this.responsiveScale);
      }
    } else {
      if (this.hasTransitionedIn) {
        this.scale.setScalar(this.responsiveScale);
      }
    }
  }

  dispose() {
    if (this.drag) {
      this.drag.destroy();
    }
  }
}
