import { BackSide, Color, Mesh, Object3D, ShaderMaterial, SphereGeometry, Vector2, Vector3 } from "three"
import vertex from '@/js/webgl/shaders/background/background.vs.glsl'
import fragment from '@/js/webgl/shaders/background/background.fs.glsl'
import { degToRad } from "three/src/math/MathUtils.js"
import { getAsset } from "@/js/utils/assetsLoader"
import WebGLStore from "@/js/webgl/store/WebGLStore"
import { sceneFolder } from "@/js/utils/debugger"

const geometry = new SphereGeometry(10, 16, 32)

const PARAMS = {
    colorInner: '#54535a',
    colorMid: '#131e20',
    colorOuter: '#000000',
    blurriness: 0,
    gradientScale1: 0.,
    gradientScale2: 0.32,
    gradientScale3: 0.40,
    gradientSpeed: 0.3,

}

export default class Background extends Object3D {
    constructor(options) {
        super(options)

        this.name = options?.name ? `Background-${options.name}` : `Background`
        this.settings = {...PARAMS, ...options?.settings}

        this.scale.setScalar(1)
        this.rotation.y = degToRad(90)

        this.init()
        this.addDebug()
    }

    init() {

        const material = new ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                tGrad: {value: getAsset('tex-gradient')},
                tBlueNoise: {value: getAsset('tex-bluenoise') },
                uResolution: { value: new Vector3() },
                uColorInner: { value: new Color(this.settings.colorInner).convertLinearToSRGB() },
                uColorMid: { value: new Color(this.settings.colorMid).convertLinearToSRGB() },
                uColorOuter: { value: new Color(this.settings.colorOuter).convertLinearToSRGB() },
                uScale: { value: 0 },
                uGradientScale1: { value: this.settings.gradientScale1 },
                uGradientScale2: { value: this.settings.gradientScale2 },
                uGradientScale3: { value: this.settings.gradientScale3 },
                uGradientSpeed: { value: this.settings.gradientSpeed },
                uBlurriness: { value: this.settings.blurriness },
                uBlueNoiseTexelSize: {value: new Vector2(1 / 8, 1 / 8)},
                uBlueNoiseCoordOffset: {value: new Vector2(0, 0)},
            },
            vertexShader: vertex,
            fragmentShader: fragment,
            side: BackSide
        })

        this.mesh = new Mesh(geometry, material)
        this.add(this.mesh)
    }
    
    addDebug() {
        const folder = sceneFolder.addFolder({title: 'Background'})

        folder.addBinding(this.settings, 'blurriness', {min: 0, max: 1, step: 0.01}).on('change', (ev) => {
            this.mesh.material.uniforms.uBlurriness.value = ev.value
        })

        folder.addBinding(this.settings, 'gradientScale1', {min: 0, max: 5, step: 0.001}).on('change', (ev) => {
            this.mesh.material.uniforms.uGradientScale1.value = ev.value
        })

        folder.addBinding(this.settings, 'gradientScale2', {min: 0, max: 5, step: 0.001}).on('change', (ev) => {
            this.mesh.material.uniforms.uGradientScale2.value = ev.value
        })

        folder.addBinding(this.settings, 'gradientScale3', {min: 0, max: 5, step: 0.001}).on('change', (ev) => {
            this.mesh.material.uniforms.uGradientScale3.value = ev.value
        })

        folder.addBinding(this.settings, 'gradientSpeed', {min: 0, max: 5, step: 0.1}).on('change', (ev) => {
            this.mesh.material.uniforms.uGradientSpeed.value = ev.value
        })

        folder.addBinding(this.settings, 'colorInner', {view: 'color'}).on('change', (ev) => {
            this.mesh.material.uniforms.uColorInner.value = new Color(ev.value).convertLinearToSRGB()
        })

        folder.addBinding(this.settings, 'colorMid', {view: 'color'}).on('change', (ev) => {
            this.mesh.material.uniforms.uColorMid.value = new Color(ev.value).convertLinearToSRGB()
        })

        folder.addBinding(this.settings, 'colorOuter', {view: 'color'}).on('change', (ev) => {
            this.mesh.material.uniforms.uColorOuter.value = new Color(ev.value).convertLinearToSRGB()
        })
    }

        
    onResize() {
        const {width, height, dpr} = WebGLStore.viewport
        const {uResolution} = this.mesh.material.uniforms
        uResolution.value.set(width * dpr, height * dpr, dpr)
    }

    onTick({time, delta, rafDamp}) {
        const {uTime, uScale} = this.mesh.material.uniforms
        uTime.value = time
    }
}
