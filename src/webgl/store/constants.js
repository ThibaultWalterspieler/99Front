import WebGLStore from "@99Stud/webgl/store/WebGLStore";

export const CONTROLS_ENABLED = false;

export const COIN_PARAMS = {
    debugPointer: false,
    color: 'rgb(227, 227, 227)',
    roughness: 0.7,
    metalness: 0.99,
    faces: ['recto', 'verso'],
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
    scale: WebGLStore.viewport.width > 768 ? 0.25 : 0.15,
    flipThreshold: 1,
    scanlineEnabled: false,
    dragEnabled: true,
    dragAxis: 'xy',
    dragSpeed: 0.05,
    dragDamping: 0.05
}

export const BACKGROUND_PARAMS = {
    colorInner: '#54535a',
    colorMid: '#131e20',
    colorOuter: '#000000',
    blurriness: 0,
    gradientScale1: 0.,
    gradientScale2: 0.32,
    gradientScale3: 0.40,
    gradientSpeed: 0.3,
}