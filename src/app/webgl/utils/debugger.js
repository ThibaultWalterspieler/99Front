import gsap from "gsap";
import { Pane } from "tweakpane";

const SAFE_PADDING = 8
const state = {
    pos: {
        start: { x: 0, y: 0 },
        current: { x: 0, y: 0 },
        last: { x: 0, y: 0 },
    },
    threshold: 10,
    moved: false,
    pressing: false
}

const tweak = new Pane();
tweak.hidden = false
export const tweakFolder = tweak.addFolder({ title: 'Debugger' })
const tabs = tweakFolder.addTab({
    pages: [
        { title: 'Renderer' },
        { title: 'Scene' },
        { title: 'PostFX' },
    ],
});
export const rendererFolder = tabs.pages[0]
export const sceneFolder = tabs.pages[1]
export const postFxFolder = tabs.pages[2]

const tweakContainer = tweak.containerElem_
const tweakWrapper = document.createElement('div')
tweakWrapper.classList.add('tp-wrapper')
const tweakDragger = tweakFolder.element.children[0]

function onResize() {
    // Only run on client side
    if (typeof window === 'undefined') return

    const { top, left } = tweakContainer.getBoundingClientRect()

    const x = gsap.utils.clamp(SAFE_PADDING, window.innerWidth - tweakContainer.offsetWidth - SAFE_PADDING, left)
    const y = gsap.utils.clamp(SAFE_PADDING, window.innerHeight - tweakContainer.offsetHeight - SAFE_PADDING, top)
    state.pos.start.x = state.pos.current.x = state.pos.last.x = x
    state.pos.start.y = state.pos.current.y = state.pos.last.y = y
    tweakContainer.style.top = `${y}px`
    tweakContainer.style.left = `${x}px`
}

function onDragDown(e) {
    state.pos.start.x = e.clientX
    state.pos.start.y = e.clientY
    state.pressing = true
    tweakDragger.classList.add('dragging')
}

function onDragMove(e) {
    if (!state.pressing) return
    if (typeof window === 'undefined') return

    const dX = e.clientX - state.pos.start.x
    const dY = e.clientY - state.pos.start.y
    state.pos.current.x = state.pos.last.x + dX
    state.pos.current.y = state.pos.last.y + dY

    if (Math.abs(dX) >= state.threshold || Math.abs(dY) >= state.threshold) {
        state.moved = true
    }

    state.pos.current.x = gsap.utils.clamp(SAFE_PADDING, window.innerWidth - tweakContainer.offsetWidth - SAFE_PADDING, state.pos.current.x)
    state.pos.current.y = gsap.utils.clamp(SAFE_PADDING, window.innerHeight - tweakContainer.offsetHeight - SAFE_PADDING, state.pos.current.y)
    tweakContainer.style.top = `${state.pos.current.y}px`
    tweakContainer.style.left = `${state.pos.current.x}px`
}

function onDragUp() {
    state.pressing = false
    state.pos.last.x = state.pos.current.x
    state.pos.last.y = state.pos.current.y
    tweakDragger.classList.remove('dragging')
}

// Only initialize event listeners on client side
if (typeof window !== 'undefined') {
    tweakDragger.addEventListener('mousedown', onDragDown)
    tweakDragger.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        !state.moved && (tweakFolder.expanded = !tweakFolder.expanded)
        state.moved = false
    }, true)
    document.addEventListener('mousemove', onDragMove)
    document.addEventListener('mouseup', onDragUp)
    document.addEventListener('keyup', (e) => e.key === 'D' && (tweak.hidden = !tweak.hidden))
    window.addEventListener('resize', onResize)
    onResize()
}

export function createFolder(parent, options, el = null) {
    const folder = parent.addFolder(options)

    if (el) {
        const defPropsFolder = folder.addFolder({ title: 'Default props' })
        defPropsFolder.expanded = false
        el.visible && defPropsFolder.addBinding(el, 'visible')
        el.position && defPropsFolder.addBinding(el, 'position')
        el.rotation && defPropsFolder.addBinding(el, 'rotation')
        el.scale && defPropsFolder.addBinding(el, 'scale')
    }

    const copyBtn = document.createElement('button')
    copyBtn.classList.add('tp-btnCopy')
    copyBtn.innerHTML = '<div class="tp-btnCopy-copied">✔</div><svg class="tp-btnCopy-copy" viewBox="0 0 32 32"><path fill="#c1c1c1" d="M 4 4 L 4 5 L 4 23 L 4 24 L 5 24 L 11 24 L 11 22 L 6 22 L 6 6 L 18 6 L 18 7 L 20 7 L 20 5 L 20 4 L 19 4 L 5 4 L 4 4 z M 12 8 L 12 9 L 12 27 L 12 28 L 13 28 L 27 28 L 28 28 L 28 27 L 28 9 L 28 8 L 27 8 L 13 8 L 12 8 z M 14 10 L 26 10 L 26 26 L 14 26 L 14 10 z"></path></svg>'
    folder.element.append(copyBtn)
    copyBtn.addEventListener('click', () => {
        copyBtn.classList.add('copied')
        gsap.delayedCall(1.5, () => copyBtn.classList.remove('copied'))
        copyData(folder)
    })
    return folder
}

export function copyData(folder) {
    const exportS = folder.exportState()
    function processChildren(children, acc) {
        children.forEach(item => {
            if (!item.children) {
                acc[item.binding.key] = item.binding.value
            } else {
                item.children.forEach(nestedItem => {
                    acc[nestedItem.binding.key] = nestedItem.binding.value;
                });
            }
        });
        return acc;
    }
    const state = processChildren(exportS.children, {});
    const data = JSON.stringify(state, null, ' ');
    navigator.clipboard.writeText(data);
}

export default tweak;