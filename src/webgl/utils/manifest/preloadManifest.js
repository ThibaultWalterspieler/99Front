
import { createManifestAssets } from '@99Stud/webgl/utils/manifest/assetsCreator'

const textures = {
  'gradient': '/assets/textures/gradient.png',
  'normal': '/assets/textures/normal.png',
  'bluenoise': '/assets/textures/bluenoise.png',
  '99stud': '/assets/textures/99stud.png'
}

const hdrs = {
  'studio': '/assets/hdr/studio_2k_1.hdr'
}

const gltfs = {
  'coin': '/assets/models/coin-optimized.glb'
}

const ktx2s = {
  'specular': '/assets/textures/specular.ktx2',
  'roughness': '/assets/textures/roughness.ktx2',
  'metalness': '/assets/textures/metalness.ktx2',
  'aomap': '/assets/textures/aomap.ktx2',
  'lightmap': '/assets/textures/lightmap.ktx2'
}

export const manifest = new Map([
  ...createManifestAssets({ obj: textures, prefix: 'tex', type: 'texture' }).entries(),
  ...createManifestAssets({ obj: hdrs, prefix: 'hdr', type: 'hdr' }).entries(),
  ...createManifestAssets({ obj: gltfs, prefix: '', type: 'gltf' }).entries(),
  ...createManifestAssets({ obj: ktx2s, prefix: 'ktx2', type: 'ktx2' }).entries(),
])

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
    'tex-99stud': {
      type: 'texture',
      tiled: true,
      flipY: false
    }
  }
}