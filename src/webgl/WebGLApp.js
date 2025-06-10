import { ThreePerf } from "three-perf"

import Camera from '@99Stud/webgl/components/Camera'
import Renderer from '@99Stud/webgl/components/Renderer'
import Scene from '@99Stud/webgl/components/Scene'
import { Emitter } from '@99Stud/webgl/events'
import { initDebugger } from '@99Stud/webgl/utils/debugger'

const isBrowser = typeof window !== 'undefined'

export default class WebGLApp {
    init(wrapper) {
        if (!wrapper || !isBrowser) return
        this.wrapper = wrapper
        this.wrapper.appendChild(Renderer.domElement)

        Camera.init()
        Scene.init()

        this.setupPerfs()
        initDebugger(wrapper)

        this.setupEvents()
        this.onResize()
    }

    setupPerfs() {
        this.perf = new ThreePerf({
            anchorX: 'left',
            anchorY: 'top',
            domElement: this.wrapper,
            renderer: Renderer
        })
    }

    setupEvents() {
        Emitter.on("site:tick", this.onTick)

        window.addEventListener('keydown', (e) => {
            let toggle = false
            if (e.key === 'p') {
                toggle = !this.perf.visible
                this.perf.visible = toggle
            }
        })
    }

    onTick = ({ time, delta, rafDamp }) => {
        Scene?.onTick?.({ time, delta, rafDamp })
        Camera?.onTick?.()

        this.perf?.begin?.()

        Renderer?.render?.(Scene, Camera)

        this.perf?.end?.()

        Renderer?.stats?.update?.()
    }

    onResize = () => {
        Scene?.onResize?.()
        Camera?.onResize?.()

        Renderer?.onResize?.()
    }
}