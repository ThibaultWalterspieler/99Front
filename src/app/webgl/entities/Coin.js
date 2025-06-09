import { AdditiveBlending, Color, FrontSide, Mesh, MeshStandardMaterial, Object3D, Vector2, Vector3 } from "three";
import { degToRad } from "three/src/math/MathUtils.js";
import { getAsset } from "@/js/utils/assetsLoader";
import Pointer from "@/js/events/Pointer";
import { sceneFolder } from "@/js/utils/debugger";
import { CustomDrag } from "../components/custom-drag";
import gsap from "gsap";
import CustomCursor from "@/js/webgl/components/cursor";

const FACES = {
    RECTO: 'recto',
    VERSO: 'verso'
}

const PARAMS = {
    debugPointer: false,
    color: 'rgb(227, 227, 227)',
    roughness: 0.7,
    metalness: 0.99,
    position: {
        x: 0,
        y: 0,
        z: 0
    },
    savedRotations: {
        y: 20,
        recto: {
            x: -20,
            z: 13
        },
        verso: {
            x: -20,
            z: -13
        }
    },
    scale: window.innerWidth > 768 ? 0.25 : 0.15,
    flipThreshold: 1,
    scanlineEnabled: false,
    dragEnabled: true,
    dragAxis: 'xy',
    dragSpeed: 0.05,
    dragDamping: 0.05
}

export default class Coin extends Object3D {
    constructor(options) {
        super(options)

        this.name = options?.name ? `Coin-${options.name}` : `Coin`
        this.settings = {...PARAMS, ...options?.settings}

        this.scale.setScalar(5)

        this.init()
        this.setupTweens()
        this.setupDrag()
        this.addDebug()
    }

    init() {
       const { scene } = getAsset('coin-optimized')

       const metallicMap = getAsset('tex-metalness')
       const normalMap = getAsset('tex-normal')
       const roughnessMap = getAsset('tex-roughness')
       const lightMap = getAsset('tex-lightmap')
       const aoMap = getAsset('tex-aomap')

       this.coin = scene.children.find((child) => child instanceof Mesh && child.name === 'Rabbit_coin')
       this.coin.geometry.center()

       this.coin.position.set(0, 0, 0)
       this.coin.scale.setScalar(this.settings.scale)
       this.face = FACES.RECTO

       this.uniforms = {
        uTime: { value: 0 },
        uResolution: { value: new Vector2(window.innerWidth, window.innerHeight) }
       }

       this.material = new MeshStandardMaterial({
        color: new Color(PARAMS.color),
        roughness: PARAMS.roughness,
        metalness: PARAMS.metalness,
        metalnessMap: metallicMap,
        normalMap: normalMap,
        roughnessMap: roughnessMap,
        aoMap: aoMap,
        aoMapIntensity: 1,
        lightMap: lightMap,
        lightMapIntensity: 1,
        side: FrontSide
       })

       if(this.settings.scanlineEnabled) {
        this.material.onBeforeCompile = (shader) => {
            shader.uniforms = Object.assign(shader.uniforms, this.uniforms);

            shader.vertexShader = shader.vertexShader.replace('#include <common>',
                `
                #include <common>
                varying vec2 vUv;
                `
            )

            shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>',
                `
                #include <project_vertex>
                vUv = uv;
                `
            )

            shader.fragmentShader = shader.fragmentShader.replace('#include <common>',
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
                `
            )
            
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
                diffuseColor.rgb += scanlineEffectInner + scanlineEffectOuter;`
            );

            shader.blending = AdditiveBlending;
        }
       }

       this.coin.material = this.material

       this.coin.position.set(this.settings.position.x, this.settings.position.y, this.settings.position.z)
       this.coin.rotation.set(degToRad(this.settings.savedRotations.recto.x), degToRad(this.settings.savedRotations.y), degToRad(this.settings.savedRotations.recto.z))
       this.add(this.coin)
    }

    setupTweens() {
        // Create tweens after coin is initialized
        this.dragRotationTween = gsap.to(this.coin.rotation, {
            duration: 0.1,
            ease: "spring(1, 0.8, 10, 0.8)",
            paused: true
        })

        this.returnRotationTween = gsap.to(this.coin.rotation, {
            x: degToRad(this.settings.savedRotations.recto.x),
            y: degToRad(this.settings.savedRotations.y),
            z: degToRad(this.settings.savedRotations.recto.z),
            duration: 1.0,
            ease: "elastic.out(1, 0.99)",
            paused: true
        })
    }

    setupDrag() {
        if (!this.settings.dragEnabled) return

        this.drag = new CustomDrag(this.coin, {
            name: 'coin-drag',
            settings: {
                axis: this.settings.dragAxis,
                speed: this.settings.dragSpeed,
                damping: this.settings.dragDamping,
                usePlane: true,
                bounds: {
                    min: new Vector3(0, 0, 0),
                    max: new Vector3(0, 0, 0)
                }
            },
            onDragStart: this.onDragStart,
            onDrag: this.onDrag,
            onDragEnd: this.onDragEnd
        })
    }

    // TODO:
    // - Debounce onDragStart and onDragEnd to prevent multiple calls and glitches
    // - Based on the direction lerp the values accordingly in order to prevent multiple 360° rotations

    onDragStart = async () => {
        await CustomCursor?.play?.('Activated')

        const targetScale = this.settings.scale * 1.05

        this.initialRotationY = this.coin.rotation.y

        this.returnRotationTween.kill()

        await gsap.to(this.coin.scale, {
            x: targetScale,
            y: targetScale,
            z: targetScale,
            duration: 1.0,
            ease: 'expo.inOut'
        })
    }

    onDrag = ({ distance }) => {
        const mappedRotation = gsap.utils.mapRange(-1, 1, -60, 60, distance.x)
        const targetRotation = Math.max(Math.min(degToRad(mappedRotation), degToRad(60)), degToRad(-60))
        

        this.dragRotationTween.vars.y = this.initialRotationY + targetRotation
        this.dragRotationTween.invalidate().restart()
    }

    onDragEnd = async ({ direction, distance }) => {
        if(!CustomCursor?.isPlaying()) {
            await CustomCursor?.play?.('Idle')
        }

        const targetScale = this.settings.scale

        this.dragRotationTween.kill()

        // If distance is passed a certain threshold (-0.5 / 0.5) flip the coin
        if(distance.x > this.settings.flipThreshold || distance.x <= -this.settings.flipThreshold) {
            this.face = this.face === FACES.RECTO ? FACES.VERSO : FACES.RECTO;

            const rotationOffset = direction.horizontal === 'right' ? 180 : -180;
            this.settings.savedRotations.y = this.settings.savedRotations.y + rotationOffset
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
                gsap.killTweensOf(this.coin.scale)
            }
        })
    }

    addDebug() {
        const coinFolder = sceneFolder.addFolder({title: 'Coin'})
        coinFolder.addBinding(PARAMS, 'color').on('change', (ev) => { this.material.color.set(ev.value) })
        coinFolder.addBinding(PARAMS, 'roughness').on('change', (ev) => { this.material.roughness = ev.value })
        coinFolder.addBinding(PARAMS, 'metalness').on('change', (ev) => { this.material.metalness = ev.value })
        coinFolder.addBinding(PARAMS.position, 'x', {min: -5, max: 5}).on('change', (ev) => { this.position.x = ev.value })
        coinFolder.addBinding(PARAMS.position, 'y', {min: -5, max: 5}).on('change', (ev) => { this.position.y = ev.value })
        coinFolder.addBinding(PARAMS.position, 'z', {min: -5, max: 5}).on('change', (ev) => { this.position.z = ev.value })
        coinFolder.addBinding(PARAMS.savedRotations.recto, 'x', {min: -180, max: 180}).on('change', (ev) => { this.coin.rotation.x = degToRad(ev.value) })
        coinFolder.addBinding(PARAMS.savedRotations, 'y', {min: -180, max: 180}).on('change', (ev) => { this.coin.rotation.y = degToRad(ev.value) })
        coinFolder.addBinding(PARAMS.savedRotations.recto, 'z', {min: -180, max: 180}).on('change', (ev) => { this.coin.rotation.z = degToRad(ev.value) })
        
        if (this.drag) {
            const dragFolder = coinFolder.addFolder({title: 'Drag'})
            dragFolder.addBinding(PARAMS, 'dragEnabled').on('change', (ev) => { 
                ev.value ? this.drag.enable() : this.drag.disable()
            })
            dragFolder.addBinding(PARAMS, 'dragAxis', {options: {xy: 'xy', x: 'x', y: 'y'}}).on('change', (ev) => { 
                this.drag.setAxis(ev.value)
            })
            dragFolder.addBinding(PARAMS, 'dragSpeed', {min: 0.001, max: 0.1}).on('change', (ev) => { 
                this.drag.settings.speed = ev.value
            })
            dragFolder.addBinding(PARAMS, 'dragDamping', {min: 0, max: 0.5}).on('change', (ev) => { 
                this.drag.settings.damping = ev.value
            })
        }

        if(this.settings.scanlineEnabled && this.uniforms) {
            coinFolder.addBinding(this.uniforms.uTime, 'value', {label: 'Scanline Time', min: 0, max: 10}).on('change', (ev) => { this.uniforms.uTime.value = ev.value })
        }
    }

    onTick({time, delta, rafDamp}) {
        if(!this.settings.debugPointer && !this.drag.state.isDragging && window.innerWidth > 768) {
            this.coin.rotation.y += (-Pointer.state.velocity.x) * (0.01 * rafDamp)
            this.coin.rotation.x += (Pointer.state.velocity.y) * (0.01 * rafDamp)
        }

        this.coin.position.y = Math.sin(time*1.2) * 0.005

        this.uniforms.uTime.value += (0.01 * rafDamp)
    }

    dispose() {
        if (this.drag) {
            this.drag.destroy()
        }
    }
}