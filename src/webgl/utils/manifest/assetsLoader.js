import {
  CanvasTexture,
  ClampToEdgeWrapping,
  EquirectangularReflectionMapping,
  ImageBitmapLoader,
  LinearFilter,
  LinearSRGBColorSpace,
  MirroredRepeatWrapping,
  NearestFilter,
  NoColorSpace,
  RepeatWrapping,
  SRGBColorSpace,
} from 'three';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

import Renderer from '@99Stud/webgl/components/Renderer';
import { assetConfigs } from '@99Stud/webgl/utils/manifest/preloadManifest';

const assets = new Map();
const gltfObjLoader = new GLTFLoader();
const dracoLoader = new DRACOLoader();
const ktx2Loader = new KTX2Loader();

const getLibPath = (path) => {
  const basePath = process.env.NODE_ENV === 'development' ? '' : '';
  return `${basePath}${path}`;
};

dracoLoader.setDecoderPath(getLibPath('/libs/draco/'));
gltfObjLoader.setDRACOLoader(dracoLoader);
ktx2Loader.setTranscoderPath(getLibPath('/libs/basis/'));
ktx2Loader.detectSupport(Renderer);

function setupTexture(texture, id) {
  const config = assetConfigs.textures[id] || {};
  texture.name = id;

  if (config.wrap) {
    switch (config.wrap) {
      case 'repeat':
        texture.wrapS = RepeatWrapping;
        texture.wrapT = RepeatWrapping;
        break;
      case 'clamp':
        texture.wrapS = ClampToEdgeWrapping;
        texture.wrapT = ClampToEdgeWrapping;
        break;
      case 'mirror':
        texture.wrapS = MirroredRepeatWrapping;
        texture.wrapT = MirroredRepeatWrapping;
        break;
      default:
    }
  }

  switch (config.colorSpace) {
    case 'none':
      texture.colorSpace = NoColorSpace;
      break;
    case 'srgb':
      texture.colorSpace = SRGBColorSpace;
      break;
    case 'linear':
      texture.colorSpace = LinearSRGBColorSpace;
      break;
    default:
      texture.colorSpace = NoColorSpace;
      break;
  }

  switch (config.filter) {
    case 'linear':
      texture.minFilter = LinearFilter;
      texture.magFilter = LinearFilter;
      break;
    case 'nearest':
      texture.minFilter = NearestFilter;
      texture.magFilter = NearestFilter;
      break;
    default:
  }

  if (config.generateMipmaps !== undefined) {
    texture.generateMipmaps = config.generateMipmaps;
  }

  if (config.anisotropy !== undefined) {
    texture.anisotropy = config.anisotropy;
  }
}

const imageLoader = function (src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`failed loading asset: ${src}`));
    img.src = src;
  });
};

const gltfLoader = (src) => {
  return new Promise((resolve, reject) => {
    gltfObjLoader.load(
      src,
      (gltf) => {
        if (gltf) {
          resolve(gltf);
        } else {
          reject(new Error(`asset failed: ${src}`));
        }
      },
      () => {
        /* progress */
      },
      () => {
        reject(new Error(`asset failed: ${src}`));
      },
    );
  });
};

const textureLoader = function ({ id, src }) {
  if (src.includes('.ktx2')) {
    return new Promise((resolve, reject) => {
      ktx2Loader.load(
        src,
        (texture) => {
          setupTexture(texture, id);
          Renderer.initTexture(texture);
          resolve(texture);
        },
        undefined,
        () => {
          reject(new Error(`asset failed KTX: ${id}`));
        },
      );
    });
  }

  return new Promise((resolve, reject) => {
    const loader = new ImageBitmapLoader();
    const config = assetConfigs.textures[id] || {};
    if (!config.flipY) {
      loader.setOptions({ imageOrientation: 'flipY' });
    }
    loader.load(
      src,
      (image) => {
        const texture = new CanvasTexture(image);
        setupTexture(texture, id);
        resolve(texture);
      },
      undefined,
      () => {
        reject(new Error(`asset failed: ${src}`));
      },
    );
  });
};

const hdrLoader = function (src) {
  return new Promise((resolve, reject) => {
    const loader = new RGBELoader();
    loader.load(
      src,
      (texture) => {
        const map = texture;
        map.mapping = EquirectangularReflectionMapping;
        texture.dispose();
        resolve(map);
      },
      undefined,
      () => {
        reject(new Error(`asset failed: ${src}`));
      },
    );
  });
};

const globalLoader = async (obj) => {
  const { id, src, type } = obj;

  let result;

  switch (type) {
    case 'image':
      result = await imageLoader(src);
      break;
    case 'gltf':
      result = await gltfLoader(src);
      break;
    case 'texture' || 'ktx2':
      result = await textureLoader(obj);
      break;
    case 'hdr':
      result = await hdrLoader(src);
      break;
    case 'ktx2':
      result = await textureLoader(obj);
      break;
  }

  assets.set(id, { result });
};

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

export const loadFile = function (obj) {
  return globalLoader(obj);
};

export const getAsset = function (id) {
  if (assets.get(id) && assets.get(id).result) {
    return assets.get(id).result;
  }
  return null;
};

class ImagesConfig {
  constructor() {
    this.modernFormatSupported = false;
  }

  checkImageFormatSupported(base64) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img.width > 0 && img.height > 0);
      img.onerror = () => resolve(false);
      try {
        img.src = base64;
      } catch {
        resolve(false);
      }
    });
  }
}
export const imagesConfig = new ImagesConfig();
