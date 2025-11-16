# WebGL Rendering Overview

## Entry & Bootstrap Flow

- `HomeClient` lazy-loads the `WebGLContext` component client-side to keep WebGL-only code out of SSR.

```7:16:src/components/pages/Home/HomeClient/index.tsx
const LazyLoadedWebGLContext = dynamic(
  () => import('@components/pages/Home/WebGLContext').then((mod) => mod.WebGLContext),
  {
    ssr: false,
  },
);

export const HomeClient: FC = () => {
  return <LazyLoadedWebGLContext className={clsx('fixed inset-0')} />;
};
```

- `WebGLContext` waits for the entire asset manifest to load, then instantiates `WebGLApp`, injects the renderer element, and nulls the instance on unmount so the runtime can be recreated cleanly.
- A `useWindowSize` watcher keeps `WebGLStore`’s viewport data and the `WebGLApp` graph in sync, which is critical because camera matrices, render targets, and entity uniforms all depend on those numbers.

```23:51:src/components/pages/Home/WebGLContext/index.tsx
useEffect(() => {
  loadManifest(manifest)
    .then(() => {
      if (typeof window !== 'undefined' && webglWrapperRef.current) {
        try {
          webglAppRef.current = new WebGLApp();
          webglAppRef.current?.init?.(webglWrapperRef.current);
        } catch (error) {
          throw new Error(`Failed to initialize WebGL: ${error}`);
        }
      }
    })
    .catch((error) => {
      throw new Error(`Failed to load manifest: ${error}`);
    });

  return () => {
    webglAppRef.current = null;
  };
}, []);

// Resize watcher
useEffect(() => {
  if (webglAppRef.current) {
    WebGLStore.onResize(width, height);

    webglAppRef.current.onResize();
  }
}, [width, height]);
```

## Frame Lifecycle & Rendering Order

### Tick emission

- `Raf` attaches a GSAP ticker that emits a `site:tick` event every frame with elapsed `delta`, absolute `time`, and a dampening ratio (normalized to 60 fps). All animation code listens to that event via the shared `Emitter`.

```14:24:src/webgl/events/Raf.ts
init() {
  gsap.ticker.add(this.onTick);
}

onTick = (time: number, deltaTime: number) => {
  if (!this.isPaused) {
    Emitter.emit('site:tick', {
      delta: deltaTime,
      time: time,
      rafDamp: gsap.ticker.deltaRatio(60),
    });
  }
};
```

### WebGLApp frame order

- Initialization attaches the renderer DOM node, spins up post-processing, the camera, and the scene, and immediately triggers a resize so every subsystem receives fresh viewport data.

```16:30:src/webgl/WebGLApp.ts
init(wrapper: HTMLElement): void {
  if (!wrapper || !isBrowser) return;
  this.wrapper = wrapper;
  this.wrapper.appendChild(Renderer.domElement);

  PostProcessing.init();

  Camera.init();
  Scene.init();

  if (isWebGLDebug) this.setupPerfs();

  this.setupEvents();
  this.onResize();
}
```

- `setupEvents` wires the GSAP-driven `site:tick` emitter to `WebGLApp.onTick` and exposes a `p` keyboard toggle for the `ThreePerf` HUD when debug mode is enabled.

```42:53:src/webgl/WebGLApp.ts
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
```

- The per-frame handler keeps state updates deterministic:
  1. `Scene.onTick` walks every child entity so they can update animations, materials, and uniforms before rendering.
  2. `Camera.onTick` advances OrbitControls (when enabled).
  3. `ThreePerf.begin` marks the frame for profiling.
  4. `PostProcessing.render` executes the render pipeline. The direct `Renderer.render(Scene, Camera)` call is commented out because the composer’s initial `RenderPass` already renders the scene.
  5. `ThreePerf.end` captures timing, and `Renderer.stats.update` refreshes the stats.js panel.

```55:75:src/webgl/WebGLApp.ts
onTick = ({ time, delta, rafDamp }: { time: number; delta: number; rafDamp: number }): void => {
  Scene?.onTick?.({ time, delta, rafDamp });
  Camera?.onTick?.();

  this.perf?.begin?.();

  // Renderer?.render?.(Scene, Camera);

  PostProcessing?.render?.();

  this.perf?.end?.();

  Renderer?.stats?.update?.();
};

onResize = (): void => {
  Scene?.onResize?.();
  Camera?.onResize?.();

  Renderer?.onResize?.();
  PostProcessing?.onResize?.();
};
```

### Post-processing chain

- `PostProcessing` allocates an `EffectComposer` with an HDR-friendly, depth-enabled render target, then stitches the pass order: `RenderPass` → `SMAA` → `GTAO` → `MotionBlur` → `Bloom` → `BrightnessContrast` → `ACESFilmicToneMapping` → `FilmPass` → `GammaCorrection` → `Output`.

```121:154:src/webgl/components/PostProcessing.js
this.composer = this.setupComposer();
this.composer.enabled = true;

this.renderPass = new RenderPass(Scene, Camera);
this.renderPass.clear = true;
this.renderPass.clearDepth = true;
this.renderPass.clearColor = true;

this.outputPass = new OutputPass();

this.setupSMAA(w, h);
this.setupGTAO();
this.setupBloomPass();
this.setupBrightnessContrast();
this.setupToneMapping();
this.setupGammaCorrection();
this.setupFilmGrainPass();
this.setupMotionBlurPass();

this.composer.addPass(this.renderPass);
this.composer.addPass(this.smaaPass);
this.composer.addPass(this.gtaoPass);
this.composer.addPass(this.motionBlurPass);
this.composer.addPass(this.bloomPass);
this.composer.addPass(this.brightnessContrastPass);
this.composer.addPass(this.toneMappingPass);
this.composer.addPass(this.filmGrainPass);
this.composer.addPass(this.gammaCorrectionPass);
this.composer.addPass(this.outputPass);
```

```162:175:src/webgl/components/PostProcessing.js
setupComposer() {
  const { width: w, height: h } = WebGLStore.viewport;
  const params = {
    format: RGBAFormat,
    type: HalfFloatType,
    minFilter: NearestFilter,
    magFilter: NearestFilter,
  };

  const rt = new WebGLRenderTarget(w, h, params);
  rt.depthTexture = new DepthTexture(w, h);

  const composer = new EffectComposer(Renderer, rt);
  return composer;
}
```

- The render call runs the composer, then optionally draws a depth overlay (quarter-screen or full-screen) when debug flags demand it.

```619:630:src/webgl/components/PostProcessing.js
render() {
  this.composer.render();

  if (PARAMS.debug.showDepth && !PARAMS.debug.fullScreenDepth && isWebGLDebug) {
    this.renderDepthVisualization();
  }

  if (PARAMS.debug.showDepth && PARAMS.debug.fullScreenDepth && isWebGLDebug) {
    this.renderFullScreenDepth();
    return;
  }
}
```

- Custom passes add extra logic: `BloomPass` performs multi-level downsampling and tent-filter upsampling before compositing, while `MotionBlurPass` keeps ping-pong render targets so it can blend the previous frame into the current one.

```322:414:src/webgl/passes/bloomPass.js
render(renderer, writeBuffer, readBuffer) {
  this.#passes_['copy-texture'].uniforms.tDiffuse.value = readBuffer.texture;
  this.#passes_['copy-texture'].needsUpdate = true;
  this.#renderPass_('copy-texture', renderer, this.#targets_['unity-downsample-0'].buffer);

  for (let i = 0; i < this.#settings_.setup.levels; i++) {
    const srcName = 'unity-downsample-' + i;
    const dstName = 'unity-downsample-' + (i + 1);
    if (!(dstName in this.#targets_)) {
      break;
    }

    const src = this.#targets_[srcName].buffer;
    const dst = this.#targets_[dstName].buffer;

    this.#passes_['unity-downsample'].uniforms.frameTexture.value = src.texture;
    this.#passes_['unity-downsample'].uniforms.useKaris.value = i == 0;
    this.#passes_['unity-downsample'].uniforms.radius.value = this.#settings_.render.downRadius;
    this.#passes_['unity-downsample'].uniforms.resolution.value = new THREE.Vector2(
      src.width,
      src.height,
    );

    if (i == 0) {
      this.#passes_['unity-downsample'].uniforms.colourMatrix.value = this.#buildColourMatrix_(
        this.#settings_.render.contrast,
        this.#settings_.render.brightness,
        this.#settings_.render.saturation,
      );
    } else {
      this.#passes_['unity-downsample'].uniforms.colourMatrix.value = new THREE.Matrix4();
    }

    this.#passes_['unity-downsample'].needsUpdate = true;
    this.#renderPass_('unity-downsample', renderer, dst);
  }

  const finalDownsample = 'unity-downsample-' + this.#settings_.setup.levels;
  const finalUpsample = 'unity-upsample-' + this.#settings_.setup.levels;
  this.#passes_['copy-texture'].uniforms.tDiffuse.value =
    this.#targets_[finalDownsample].buffer.texture;
  this.#passes_['copy-texture'].needsUpdate = true;
  this.#renderPass_('copy-texture', renderer, this.#targets_[finalUpsample].buffer);

  for (let i = this.#settings_.setup.levels; i >= 0; i--) {
    const srcName = 'unity-upsample-' + (i + 1);
    const dstName = 'unity-upsample-' + i;
    if (!(srcName in this.#targets_)) {
      continue;
    }

    const src = this.#targets_[srcName].buffer;
    const srcMip = this.#targets_['unity-downsample-' + (i + 1)].buffer;
    const dst = this.#targets_[dstName].buffer;

    this.#passes_['unity-upsample'].uniforms.frameTexture.value = src.texture;
    this.#passes_['unity-upsample'].uniforms.mipTexture.value = srcMip.texture;
    this.#passes_['unity-upsample'].uniforms.radius.value = this.#settings_.render.upRadius;
    this.#passes_['unity-upsample'].uniforms.resolution.value = new THREE.Vector2(
      src.width,
      src.height,
    );
    this.#passes_['unity-upsample'].needsUpdate = true;

    this.#renderPass_('unity-upsample', renderer, dst);
  }

  this.#passes_['unity-composite'].uniforms.frameTexture.value = readBuffer.texture;
  this.#passes_['unity-composite'].uniforms.bloomTexture.value =
    this.#targets_['unity-upsample-1'].buffer.texture;
  this.#passes_['unity-composite'].uniforms.bloomStrength.value =
    this.#settings_.composite.strength;
  this.#passes_['unity-composite'].uniforms.bloomMix.value = this.#settings_.composite.mixFactor;
  this.#passes_['unity-composite'].needsUpdate = true;
  this.#renderPass_('unity-composite', renderer, writeBuffer);

  this.needsSwap = true;
}
```

```127:147:src/webgl/passes/motionBlurPass.js
render(renderer, writeBuffer, readBuffer, _deltaTime, _maskActive) {
  // Update uniforms
  const blurMaterial = this.#passes_['unity-composite'];
  blurMaterial.uniforms.frameTexture.value = readBuffer.texture;
  blurMaterial.uniforms.lastFrameTexture.value = this.#lastRenderTarget.texture;
  blurMaterial.uniforms.intensity.value = this.settings.render.intensity;

  // Render the motion blur effect
  this.#renderPass_('unity-composite', renderer, this.#currentRenderTarget);

  // Copy result to the output buffer
  this.#quad_.material = this.#passes_['copy-texture'];
  this.#quad_.material.uniforms.tDiffuse.value = this.#currentRenderTarget.texture;
  renderer.setRenderTarget(writeBuffer);
  this.#quad_.render(renderer);

  // Swap render targets for next frame
  const temp = this.#currentRenderTarget;
  this.#currentRenderTarget = this.#lastRenderTarget;
  this.#lastRenderTarget = temp;
}
```

## Scene Graph & Update Logic

- The `Stage` scene hosts every renderable: the camera, an HDR environment map, the coin entity, an optional texture tunnel, a gradient background sphere, and a key directional light. `onTick`/`onResize` simply delegate to child objects, so entity logic stays encapsulated.

```21:75:src/webgl/components/Scene.js
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
  this.tunnel = new TextureTunnel();
  // this.add(this.tunnel);

  this.background = new Background();
  this.add(this.background);

  this.light = new DirectionalLight(0xffffff, 0.5);
  this.light.position.set(4, 3, 10);
  this.add(this.light);

  this.addDebug();
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
```

## Entities & Animations

### Coin

- Loads the optimized GLTF coin mesh plus all supporting KTX2/PNG textures from the manifest, applies PBR settings, centers the geometry, and scales/positions it according to responsive viewport data.
- Adds a GSAP-driven “transition in” animation, optional scanline shader customization, and registers `CustomDrag` for pointer-driven rotations. Per-frame it reads pointer velocity to add inertial motion and advances shader uniforms; on resize it refreshes `uResolution` and responsive scale.

```92:229:src/webgl/entities/Coin.ts
async init() {
  const { scene } = getAsset('coin-optimized');

  const metallicMap = getAsset('ktx2-metalness');
  metallicMap.colorSpace = NoColorSpace;

  const normalMap = getAsset('tex-normal');
  normalMap.colorSpace = NoColorSpace;

  const roughnessMap = getAsset('ktx2-roughness');
  roughnessMap.colorSpace = NoColorSpace;

  const lightMap = getAsset('ktx2-lightmap');
  lightMap.colorSpace = NoColorSpace;

  const aoMap = getAsset('ktx2-aomap');
  aoMap.colorSpace = NoColorSpace;

  this.coin = scene.children.find(
    (child: Object3D) => child instanceof Mesh && child.name === 'Rabbit_coin',
  ) as Mesh;
  this.coin.geometry.center();

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
      // ...
    };
  }

  this.coin.material = this.material;
  // ...
  this.add(this.coin);

  await this.transitionIn();
}
```

```231:305:src/webgl/entities/Coin.ts
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
```

```522:563:src/webgl/entities/Coin.ts
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
```

### Background

- Renders a reversed sphere with a gradient texture, blue-noise dithering, and layered simplex noise to avoid banding. Uniforms control multiple gradient scales, speeds, and colors, and a `sceneFolder` exposes them in the debug UI. The shader time uniform updates every frame, and `uResolution` synchronizes with viewport/DPR changes.

```35:228:src/webgl/entities/Background.js
init() {
  const texture = getAsset('tex-gradient');
  texture.colorSpace = SRGBColorSpace;
  const material = new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      tGrad: { value: texture },
      tBlueNoise: { value: getAsset('tex-bluenoise') },
      uResolution: { value: new Vector3() },
      uColorInner: { value: new Color(this.settings.colorInner) },
      uColorMid: { value: new Color(this.settings.colorMid) },
      uColorOuter: { value: new Color(this.settings.colorOuter) },
      // ...
    },
    vertexShader: `
                varying vec2 vUv;

                void main() {
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    vUv = uv;
                }
            `,
    fragmentShader: `
                precision highp float;
                uniform float uTime;
                uniform sampler2D tGrad;
                // ...
                gl_FragColor = vec4(col, 1.);
            `,
    side: BackSide,
  });

  this.mesh = new Mesh(geometry, material);
  this.add(this.mesh);
}

onResize() {
  const { width, height, dpr } = WebGLStore.viewport;
  const { uResolution } = this.mesh.material.uniforms;
  uResolution.value.set(width * dpr, height * dpr, dpr);
}

onTick({ time }) {
  const { uTime } = this.mesh.material.uniforms;
  uTime.value = time;
}
```

### Texture Tunnel

- Prepares a plane with a repeating 99stud texture, additive blending, and animated UVs, but its `add` call is commented out in `Scene.init`, so it is currently inactive.

```45:120:src/webgl/entities/TextTunnel.js
init() {
  const texture = getAsset('tex-99stud');
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.flipY = true;

  const material = new ShaderMaterial({
    uniforms: {
      ...this.settings.uniforms,
      uTime: { value: 0 },
      uResolution: { value: new Vector2(WebGLStore.viewport.width, WebGLStore.viewport.height) },
      tTexture: { value: texture },
      uCellScale: { value: new Vector2(1, 1) },
    },
    vertexShader: `
                varying vec2 vUv;

                void main() {
                    vUv = uv * 3.0;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
    fragmentShader: `
                uniform float uTime;
                // ...
                gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
            `,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: AdditiveBlending,
  });

  this.mesh = new Mesh(geometry, material);
  this.mesh.position.set(0, 0, 0);
  this.add(this.mesh);

  texture.dispose();
}
```

## Interaction Stack

- `Pointer` normalizes mouse/touch input, tracks velocities via smoothed dampening, and emits `site:pointer:*` events on the shared `Emitter`, enabling drag and hover experiences to stay in step with the render loop.

```34:121:src/webgl/events/Pointer.js
init() {
  if (isTouchDevice) {
    document.addEventListener('touchstart', this.onTouchStart, { passive: false });
    document.addEventListener('touchmove', this.onTouchMove, { passive: false });
    window.addEventListener('touchend', this.onTouchEnd);
    window.addEventListener('touchcancel', this.onTouchEnd);
  } else {
    document.addEventListener('pointerdown', this.onPointerDown);
    document.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointerleave', this.onPointerUp);
  }

  Emitter.on('site:tick', this.onTick);
}

onTouchStart = (e) => {
  // ...
  Emitter.emit('site:pointer:down', {
    e,
    state: {
      pos: this.state.target,
      normalizedPos: this.state.normalized,
      mappedPos: this.state.mapped,
      isTouch: true,
      touchStartTime: state.touchStartTime,
      touchStartPos: state.touchStartPos,
      isInteractive,
    },
  });
};

onPointerMove = (e) => {
  this.updatePosition(e.clientX, e.clientY);

  Emitter.emit('site:pointer:move', {
    e,
    state: {
      pos: this.state.target,
      normalizedPos: this.state.normalized,
      mappedPos: this.state.mapped,
      isTouch: false,
    },
  });
};
```

- `CustomDrag` subscribes to these pointer events, rays into the scene to pick objects, constrains drag axes, applies damping/momentum, and calls the provided coin callbacks so the entity can adjust rotation/face state.

```165:317:src/webgl/components/CustomDrag.js
bindEvents() {
  Emitter.on('site:pointer:down', this.onPointerDown);
  Emitter.on('site:pointer:move', this.onPointerMove);
  Emitter.on('site:pointer:up', this.onPointerUp);
}

onPointerDown = ({ state }) => {
  if (!this.settings.dragEnabled) return;

  this.updatePointer(state.mappedPos);
  this.raycaster.setFromCamera(this.pointer, Camera);

  const intersects = this.raycaster.intersectObject(this.target, true);

  if (intersects.length > 0) {
    // ...
    this.startDrag(state.pos, intersects[0]);
  }
};

onPointerMove = ({ state }) => {
  if (!this.state.isDragging) return;

  this.state.lastTouchTime = Date.now();

  this.updateDrag(state.pos, state.mappedPos);
};

onPointerUp = ({ _state, _e }) => {
  if (this.state.isDragging) {
    // ...
    this.endDrag();
  }
};
```

## Resizing & Viewport Management

- The React-side watcher updates both `WebGLStore` and `WebGLApp`, which in turn calls each subsystem’s `onResize`.
- `WebGLStore.onResize` updates width/height/aspect plus breakpoint flags so responsive behaviors (coin scaling, layout decisions) can use accurate information.
- Entities such as `Coin` and `Background`, along with `Camera`, `Renderer`, and `PostProcessing`, respond to `onResize` to update matrices, render target sizes, and resolution uniforms.

```103:111:src/webgl/store/WebGLStore.ts
onResize(width: number, height: number): void {
  this.#viewport.width = width;
  this.#viewport.height = height;
  this.#viewport.aspect = width / height;

  this.#viewport.breakpoints.xl = width >= 1280;
  this.#viewport.breakpoints.lg = width >= 1024;
  this.#viewport.breakpoints.md = width >= 768;
}
```

```54:60:src/webgl/components/Camera.ts
onResize(): void {
  const { viewport } = WebGLStore;

  this.aspect = viewport.aspect;
  this.unit = this.calculateUnitSize();
  this.updateProjectionMatrix();
}
```

```54:59:src/webgl/components/Renderer.js
onResize() {
  const { width, height, dpr } = WebGLStore.viewport;

  this.setSize(width, height);
  this.setPixelRatio(dpr);
}
```

```632:635:src/webgl/components/PostProcessing.js
onResize() {
  const { width, height, dpr } = WebGLStore.viewport;
  this.composer.setSize(width, height);
  this.composer.setPixelRatio(dpr);
}
```

## Asset Pipeline & Materials

- The manifest declares every HDR, GLTF, texture, and KTX2 resource used by the scene. `loadManifest` walks that map, skips assets already cached, and resolves when everything is ready so the scene can safely call `getAsset`.

```27:72:src/webgl/utils/manifest/preloadManifest.js
export const manifest = new Map([
  ...createManifestAssets({ obj: textures, prefix: 'tex', type: 'texture' }).entries(),
  ...createManifestAssets({ obj: hdrs, prefix: 'hdr', type: 'hdr' }).entries(),
  ...createManifestAssets({ obj: gltfs, prefix: '', type: 'gltf' }).entries(),
  ...createManifestAssets({ obj: ktx2s, prefix: 'ktx2', type: 'ktx2' }).entries(),
]);

export const assetConfigs = {
  textures: {
    'tex-normal': {
      type: 'texture',
      mipmap: false,
      anisotropy: 8,
      flipY: true,
    },
    // ...
  },
};
```

```209:256:src/webgl/utils/manifest/assetsLoader.js
export const loadManifest = function (arrayIn, onProgress = null) {
  const leanArray = Array.from(arrayIn, (item) => {
    return { id: item[0], ...item[1] };
  });
  const array = leanArray.filter((item) => {
    return !getAsset(item.id);
  });
  const numItems = array.length;
  let numLoaded = 0;
  const failed = [];

  return new Promise((resolve, reject) => {
    const ready = function () {
      const itemsProgressed = numLoaded + failed.length;
      if (itemsProgressed === numItems) {
        if (failed.length) {
          reject(failed);
        } else {
          resolve();
        }
      }

      if (onProgress) {
        const progress = itemsProgressed / numItems;
        onProgress(progress);
      }
    };

    if (numItems <= 0) {
      onProgress?.(1);
      resolve();
      return;
    }

    for (let i = 0, len = numItems; i < len; i++) {
      globalLoader(array[i])
        .then(() => {
          numLoaded++;
          ready();
          return null; // Fix for promise/always-return
        })
        .catch((err) => {
          failed.push(err);
          ready();
        });
    }
  });
};
```

- Entities (`Scene`, `Coin`, `Background`, `TextureTunnel`) call `getAsset` to pull these resources from the cache, avoiding duplicate fetches or loader thrash.

## Debug & Instrumentation

- When `NEXT_PUBLIC_WEBGL_DEBUG=true`, `WebGLApp` spawns a `ThreePerf` overlay anchored inside the wrapper, toggled via the `p` key.

```32:50:src/webgl/WebGLApp.ts
setupPerfs(): void {
  if (!this.wrapper) return;
  this.perf = new ThreePerf({
    anchorX: 'left',
    anchorY: 'top',
    domElement: this.wrapper,
    renderer: Renderer,
  });
}
```

- `Renderer` enables `stats.js`, exposes renderer memory stats via the debugger UI, and allows pausing the global RAF loop.

```8:59:src/webgl/components/Renderer.js
class Renderer extends WebGLRenderer {
  constructor() {
    super({
      powerPreference: 'high-performance',
      antialias: false,
      depth: true,
      preserveDrawingBuffer: true,
      logarithmicDepthBuffer: true,
    });

    // PostFX
    this.outputColorSpace = SRGBColorSpace;

    this.addStats();
    this.addDebug();
  }

  addStats() {
    this.stats = new Stats();
    this.stats.dom.style.position = 'relative';
    // ...
  }

  addDebug() {
    if (!rendererFolder) return;
    rendererFolder.addBinding(this.info.memory, 'geometries', {
      label: 'geometries',
      readonly: true,
    });
    // ...
    rendererFolder.children[rendererFolder.children.length - 1].element.after(this.stats.dom);
    window.addEventListener('keyup', (e) => {
      if (e.key !== 'p') return;
      GlobalRaf.isPaused = !GlobalRaf.isPaused;
      tweak.refresh();
    });
  }
}
```

- Post-processing adds depth-visualization helpers (quarter-screen overlay or full-screen replacement) to quickly diagnose depth precision issues without leaving the runtime.

```391:614:src/webgl/components/PostProcessing.js
setupDepthVisualization() {
  this.depthVisualizationMaterial = new ShaderMaterial({
    uniforms: {
      tDepth: { value: null },
      cameraNear: { value: 0.1 },
      cameraFar: { value: 100.0 },
      depthScale: { value: 10.0 },
      useLogScale: { value: true },
      forcePackedDepth: { value: false },
    },
    // ...
  });

  const quadGeometry = new PlaneGeometry(2, 2);
  const quadMaterial = new MeshBasicMaterial({ depthTest: false, depthWrite: false });

  this.debugQuad = new Mesh(quadGeometry, quadMaterial);
  this.debugScene = new ThreeScene();
  this.debugCamera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 1000);
  this.debugScene.add(this.debugQuad);

  // Setup debug controls
  this.setupDepthDebugControls();
}

renderDepthVisualization() {
  if (!this.debugQuad || !this.depthVisualizationMaterial) return;

  const depthTexture = this.composer.readBuffer.depthTexture;
  if (!depthTexture) return;

  this.depthVisualizationMaterial.uniforms.tDepth.value = depthTexture;
  this.depthVisualizationMaterial.uniforms.cameraNear.value = Camera.near;
  this.depthVisualizationMaterial.uniforms.cameraFar.value = Camera.far;
  // ...
  Renderer.autoClear = false;
  Renderer.render(this.debugScene, this.debugCamera);
  Renderer.autoClear = true;
}
```

## Key Takeaways

- Rendering is synchronized through a single GSAP ticker → emitter → `WebGLApp` pipeline, ensuring deterministic update order (entities → camera → post-processing → HUD).
- The scene graph is intentionally thin: `Scene` delegates work to child entities, so new effects can hook into the same `onTick/onResize` pattern without touching the central loop.
- Post-processing is the heart of the pipeline: it renders the scene once via `RenderPass` and then layers SMAA, GTAO, optional motion blur, bloom, tone mapping, and film grain before handing pixels to the DOM.
- Responsive behavior flows from React → `WebGLStore` → `WebGLApp.onResize`, keeping camera matrices, composer buffers, and entity uniforms in sync with the viewport so visuals and post-fx stay stable.
