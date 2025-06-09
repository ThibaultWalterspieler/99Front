// import { createManifestAssets } from './assetsCreator.js'

// const textures = import.meta.glob(['../../assets/textures/*', '../../assets/textures/*/*'], { as: 'url', eager: true })
// const hdrs = import.meta.glob('@/assets/hdr/*.hdr', { as: 'url', eager: true })
// const gltfs = import.meta.glob('@/assets/models/*.glb', { as: 'url', eager: true })
// const ktx2s = import.meta.glob('@/assets/*.ktx2', { as: 'url', eager: true })

// Create empty manifest for now
export const manifest = new Map()

// Keep the asset configurations
export const assetConfigs = {
  textures: {
    'tex-normal': {
      type: 'texture',
      mipmap: false,
      anisotropy: 8,
      flipY: true
    },
    'tex-lightmap': {
      type: 'texture',
      flipY: true
    },
    'tex-aomap': {
      type: 'texture',
      flipY: false
    },
    'tex-specular': {
      type: 'texture',
      flipY: true
    },
    'tex-metalness': {
      type: 'texture',
      flipY: true
    },
    'tex-roughness': {
      type: 'texture',
      flipY: true
    },
    'tex-env': {
      type: 'texture',
      flipY: true
    }
  }
}