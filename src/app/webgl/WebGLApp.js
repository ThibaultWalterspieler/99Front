import { ThreePerf } from "three-perf"
import Stats from 'stats-js'
import { GlobalRaf } from './events'
import tweak from './utils/debugger'
import { rendererFolder } from './utils/debugger'


export default class WebGLApp {
    init() {
        document.querySelector('.webgl').appendChild(renderer.domElement)

        Camera.init()
        Scene.init()


        if(USE_POSTFX) {
            PostFX.init()
        }


        this.setupPerfs()
        this.setupStats()
        this.setupEvents()
        this.onResize()

        this.addDebug()

    }

    addStats () {
        this.stats = new Stats()
        this.stats.dom.style.position = 'relative'
        this.stats.dom.style.display = 'flex'
        this.stats.dom.style.flexDirection = 'row'
        this.stats.dom.style.justifyContent = 'flex-start'
        this.stats.dom.style.pointerEvents = 'none'
        for (const child of this.stats.dom.children) {
          child.style.display = 'inline-block'
        }
    }

    setupPerfs() {
        this.perf = new ThreePerf({
            anchorX: 'left',
            anchorY: 'top',
            domElement: document.querySelector('.webgl'),
            renderer: renderer
        })
    }

    setupEventListeners() {
        Emitter.on('site:resize', this.onResize)
        Emitter.on("site:tick", this.onTick)

        window.addEventListener('keydown', (e) => {
        let toggle = false
        if (e.key === 'p') {
            toggle = !this.perf.visible
            this.perf.visible = toggle
        }
        })
    }

    addDebug() {
        rendererFolder.addBinding(this.info.memory, 'geometries', { label: 'geometries', readonly: true })
        rendererFolder.addBinding(this.info.memory, 'textures', {readonly: true})
        rendererFolder.addBinding(GlobalRaf, "isPaused", {label: 'Pause Raf'});
        rendererFolder.children[rendererFolder.children.length - 1].element.after(this.stats.dom)
        window.addEventListener("keyup", (e) => {
          if (e.key !== "p") return;
          GlobalRaf.isPaused = !GlobalRaf.isPaused;
          tweak.refresh();
        })
    }

    onTick = ({ time, delta, rafDamp }) => {
        scene?.onTick({time, delta, rafDamp})
        camera.onTick()
        
        this.perf?.begin?.()
    
        if (USE_POSTFX) {
          postfx.render(scene, camera)
        } else {
          renderer.render(scene, camera)
        }
    
        this.perf?.end?.()

        this.stats?.update?.()
    }

    onResize = () => {
        scene?.onResize()
        camera?.onResize()
    
        if(USE_POSTFX) {
            postfx?.onResize()
        } else {
            renderer?.onResize()
        }
    }
}