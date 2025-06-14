import gsap from 'gsap';
import { Color, FrontSide, Mesh, MeshStandardMaterial, Object3D, Vector2, Vector3 } from 'three';
import { degToRad } from 'three/src/math/MathUtils.js';

import { CustomDrag } from '@99Stud/webgl/components/CustomDrag';
import { GlobalPointer } from '@99Stud/webgl/events';
import { COIN_PARAMS } from '@99Stud/webgl/store/constants';
import WebGLStore from '@99Stud/webgl/store/WebGLStore';
import { sceneFolder } from '@99Stud/webgl/utils/debugger';
import { getAsset } from '@99Stud/webgl/utils/manifest/assetsLoader';

interface CoinOptions {
  name?: string;
  settings?: Partial<typeof COIN_PARAMS> & {
    faces?: string[];
    scale?: number;
    scanlineEnabled?: boolean;
    dragEnabled?: boolean;
    dragAxis?: string | 'xy' | 'x' | 'y';
    dragSpeed?: number;
    dragDamping?: number;
    flipThreshold?: number;
    savedRotations?: {
      y: number;
      recto: { x: number; z: number };
      verso: { x: number; z: number };
      [key: string]: unknown;
    };
    position?: { x: number; y: number; z: number };
    debugPointer?: boolean;
  };
}

// Fallback type for sceneFolder to avoid never type error
const sceneFolderTyped: unknown = sceneFolder;

export default class Coin extends Object3D {
  name: string;
  settings: typeof COIN_PARAMS & CoinOptions['settings'];
  baseScale: number;
  baseRotation: number;
  responsiveScale: number;
  hasTransitionedIn: boolean;
  coin!: Mesh;
  face!: string;
  uniforms!: {
    uTime: { value: number };
    uResolution: { value: Vector2 };
  };
  material!: MeshStandardMaterial;
  dragRotationTween!: gsap.core.Tween;
  returnRotationTween!: gsap.core.Tween;
  drag?: CustomDrag;
  initialRotationY!: number;

  constructor(options: CoinOptions = {}) {
    super();

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
    this.setupDrag();
    this.addDebug();
    this.onResize();
  }

  async init() {
    const asset = getAsset('coin-optimized');
    const { scene } = asset;

    const metallicMap = getAsset('ktx2-metalness');
    const normalMap = getAsset('tex-normal');
    const roughnessMap = getAsset('ktx2-roughness');
    const lightMap = getAsset('ktx2-lightmap');
    const aoMap = getAsset('ktx2-aomap');

    this.coin = scene.children.find(
      (child: Object3D) => child instanceof Mesh && child.name === 'Rabbit_coin',
    ) as Mesh;

    if (!this.coin) {
      throw new Error("Coin mesh 'Rabbit_coin' not found in coin-optimized asset.");
    }

    this.coin.position.set(0, 0, 0);
    this.coin.scale.setScalar(this.settings.scale);
    this.face = this.settings.faces![0];

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
      this.material.onBeforeCompile = (shader: unknown) => {
        const s = shader as { uniforms: unknown; vertexShader: string; fragmentShader: string };
        s.uniforms = Object.assign(s.uniforms as Record<string, unknown>, this.uniforms);
        s.vertexShader = s.vertexShader.replace(
          '#include <common>',
          `
                #include <common>
                varying vec2 vUv;
                `,
        );
        s.vertexShader = s.vertexShader.replace(
          '#include <project_vertex>',
          `
                #include <project_vertex>
                vUv = uv;
                `,
        );
        s.fragmentShader = s.fragmentShader.replace(
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
        s.fragmentShader = s.fragmentShader.replace(
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
        // s.blending = AdditiveBlending; // Not a valid property on shader
      };
    }

    this.coin.material = this.material;

    this.coin.position.set(
      this.settings.position!.x,
      this.settings.position!.y,
      this.settings.position!.z,
    );
    this.coin.rotation.set(
      degToRad(this.settings.savedRotations!.recto.x),
      degToRad(this.settings.savedRotations!.y),
      degToRad(this.settings.savedRotations!.recto.z),
    );
    this.add(this.coin);

    await this.transitionIn();
    this.setupTweens();
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

    // Type guard for dragAxis
    const axis = (['xy', 'x', 'y'] as const).includes(
      this.settings.dragAxis as unknown as 'xy' | 'x' | 'y',
    )
      ? (this.settings.dragAxis as 'xy' | 'x' | 'y')
      : 'xy';

    this.drag = new CustomDrag(this.coin, {
      name: 'coin-drag',
      settings: {
        axis: axis,
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

  onDrag = ({ distance }: { distance: { x: number; y: number } }) => {
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

  onDragEnd = async ({
    direction,
    distance,
  }: {
    direction: { horizontal: string };
    distance: { x: number; y: number };
  }) => {
    const targetScale = this.settings.scale;

    this.dragRotationTween.kill();

    // If distance is passed a certain threshold (-0.5 / 0.5) flip the coin
    if (distance.x > this.settings.flipThreshold || distance.x <= -this.settings.flipThreshold) {
      this.face =
        this.face === this.settings.faces![0] ? this.settings.faces![1] : this.settings.faces![0];

      const rotationOffset = direction.horizontal === 'right' ? 180 : -180;
      this.settings.savedRotations!.y = this.settings.savedRotations!.y + rotationOffset;
    }

    const targetRotations = this.settings.savedRotations![this.face.toLowerCase()] as {
      x: number;
      y: number;
      z: number;
    };

    this.returnRotationTween.vars.x = degToRad(targetRotations.x);
    this.returnRotationTween.vars.y = degToRad(this.settings.savedRotations!.y);
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
    if (
      !sceneFolderTyped ||
      typeof (sceneFolderTyped as { addFolder?: unknown }).addFolder !== 'function'
    )
      return;
    const coinFolder = (
      sceneFolderTyped as { addFolder: (opts: { title: string }) => unknown }
    ).addFolder({ title: 'Coin' }) as {
      addBinding: (...args: unknown[]) => unknown;
      addFolder: (opts: { title: string }) => unknown;
    };
    const coinFolderObj = coinFolder as {
      addBinding: (...args: unknown[]) => unknown;
      addFolder: (opts: { title: string }) => unknown;
    };
    (
      coinFolderObj.addBinding(COIN_PARAMS, 'color') as {
        on: (event: string, cb: (ev: { value: string }) => void) => void;
      }
    ).on('change', (ev: { value: string }) => {
      this.material.color.set(ev.value);
    });
    (
      coinFolderObj.addBinding(COIN_PARAMS, 'roughness') as {
        on: (event: string, cb: (ev: { value: number }) => void) => void;
      }
    ).on('change', (ev: { value: number }) => {
      this.material.roughness = ev.value;
    });
    (
      coinFolderObj.addBinding(COIN_PARAMS, 'metalness') as {
        on: (event: string, cb: (ev: { value: number }) => void) => void;
      }
    ).on('change', (ev: { value: number }) => {
      this.material.metalness = ev.value;
    });
    (
      coinFolderObj.addBinding(COIN_PARAMS.position, 'x', { min: -5, max: 5 }) as {
        on: (event: string, cb: (ev: { value: number }) => void) => void;
      }
    ).on('change', (ev: { value: number }) => {
      this.position.x = ev.value;
    });
    (
      coinFolderObj.addBinding(COIN_PARAMS.position, 'y', { min: -5, max: 5 }) as {
        on: (event: string, cb: (ev: { value: number }) => void) => void;
      }
    ).on('change', (ev: { value: number }) => {
      this.position.y = ev.value;
    });
    (
      coinFolderObj.addBinding(COIN_PARAMS.position, 'z', { min: -5, max: 5 }) as {
        on: (event: string, cb: (ev: { value: number }) => void) => void;
      }
    ).on('change', (ev: { value: number }) => {
      this.position.z = ev.value;
    });
    (
      coinFolderObj.addBinding(COIN_PARAMS.savedRotations.recto, 'x', { min: -180, max: 180 }) as {
        on: (event: string, cb: (ev: { value: number }) => void) => void;
      }
    ).on('change', (ev: { value: number }) => {
      this.coin.rotation.x = degToRad(ev.value);
    });
    (
      coinFolderObj.addBinding(COIN_PARAMS.savedRotations, 'y', { min: -180, max: 180 }) as {
        on: (event: string, cb: (ev: { value: number }) => void) => void;
      }
    ).on('change', (ev: { value: number }) => {
      this.coin.rotation.y = degToRad(ev.value);
    });
    (
      coinFolderObj.addBinding(COIN_PARAMS.savedRotations.recto, 'z', { min: -180, max: 180 }) as {
        on: (event: string, cb: (ev: { value: number }) => void) => void;
      }
    ).on('change', (ev: { value: number }) => {
      this.coin.rotation.z = degToRad(ev.value);
    });

    if (this.drag) {
      const dragFolder = coinFolderObj.addFolder({ title: 'Drag' }) as {
        addBinding: (...args: unknown[]) => unknown;
      };
      (
        dragFolder.addBinding(COIN_PARAMS, 'dragEnabled') as {
          on: (event: string, cb: (ev: { value: boolean }) => void) => void;
        }
      ).on('change', (ev: { value: boolean }) => {
        if (ev.value) {
          this.drag!.enable();
        } else {
          this.drag!.disable();
        }
      });
      (
        dragFolder.addBinding(COIN_PARAMS, 'dragAxis', {
          options: { xy: 'xy', x: 'x', y: 'y' },
        }) as { on: (event: string, cb: (ev: { value: string }) => void) => void }
      ).on('change', (ev: { value: string }) => {
        // Type guard for dragAxis
        const axis = (['xy', 'x', 'y'] as const).includes(ev.value as unknown as 'xy' | 'x' | 'y')
          ? (ev.value as 'xy' | 'x' | 'y')
          : 'xy';
        this.drag!.setAxis(axis);
      });
      (
        dragFolder.addBinding(COIN_PARAMS, 'dragSpeed', { min: 0.001, max: 0.1 }) as {
          on: (event: string, cb: (ev: { value: number }) => void) => void;
        }
      ).on('change', (ev: { value: number }) => {
        this.drag!.settings.speed = ev.value;
      });
      (
        dragFolder.addBinding(COIN_PARAMS, 'dragDamping', { min: 0, max: 0.5 }) as {
          on: (event: string, cb: (ev: { value: number }) => void) => void;
        }
      ).on('change', (ev: { value: number }) => {
        this.drag!.settings.damping = ev.value;
      });
    }

    if (this.settings.scanlineEnabled && this.uniforms) {
      (
        coinFolderObj.addBinding(this.uniforms.uTime, 'value', {
          label: 'Scanline Time',
          min: 0,
          max: 10,
        }) as { on: (event: string, cb: (ev: { value: number }) => void) => void }
      ).on('change', (ev: { value: number }) => {
        this.uniforms.uTime.value = ev.value;
      });
    }
  }

  onTick({ time, rafDamp }: { time: number; rafDamp: number }) {
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
    uResolution.value.set(width * dpr, height * dpr);

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
