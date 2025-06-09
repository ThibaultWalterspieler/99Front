import camera from '@/js/webgl/components/camera'
import store from '@/js/store/globalStore'

export function unitToPxSize (size, unitWidth = null) {
    const {width} = store.viewport
    const canvasVw = unitWidth || camera.unit.width
    const viewportVw = width
    if (viewportVw === 0 || size === 0 || canvasVw === 0) return 0
    const normalizedSize = size / viewportVw * canvasVw
    return normalizedSize
}

export function unitToViewSize (size, measurement = 'height', device = 'desktop') {
    const {width, height} = store.viewport
    const deviceHeight = device === 'desktop' ? 800 : 568
    const deviceWidth = device === 'desktop' ? 1400 : 320
    const deviceSize = measurement === 'height' ? deviceHeight : deviceWidth
    const canvasSize = measurement === 'height' ? camera.unit.height : camera.unit.width
    const viewportSize = measurement === 'height' ? height : width
    if (viewportSize === 0 || size === 0 || canvasSize === 0) return 0
    const finalSize = (size / viewportSize) * (viewportSize / deviceSize) * canvasSize
    return finalSize
}
