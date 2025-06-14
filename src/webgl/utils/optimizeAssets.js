import { execSync } from 'child_process';
import path from 'path';

import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import * as FUNCTIONS from '@gltf-transform/functions';
import draco3d from 'draco3dgltf';
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';

// Configure I/O.
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.decoder': await draco3d.createDecoderModule(), // Optional.
  'draco3d.encoder': await draco3d.createEncoderModule(), // Optional.
});

async function optimizeGLTF(inputPath, outputPath) {
  const quality = 128;

  execSync(`npx gltf-transform etc1s ${inputPath} ${outputPath} --quality ${quality}`);

  const document = await io.read(outputPath);

  await document.transform(
    FUNCTIONS.dedup(),
    FUNCTIONS.flatten(),
    FUNCTIONS.join(),
    FUNCTIONS.weld(),
    FUNCTIONS.quantize({
      quantizePosition: 16,
      quantizeNormal: 16,
      quantizeTexcoord: 16,
    }),
    FUNCTIONS.simplify({
      simplifier: MeshoptSimplifier,
      error: 0.01,
      ratio: 0.25,
      lockBorder: true,
    }),
    FUNCTIONS.reorder({
      encoder: MeshoptEncoder,
      target: 'performance',
    }),
    FUNCTIONS.resample(),
    FUNCTIONS.prune(),
    FUNCTIONS.draco(),
  );

  await io.write(outputPath, document);
}

const inputPath = path.resolve('src/assets/models/coin.glb');
const outputPath = path.resolve('src/assets/models/coin-optimized.glb');

optimizeGLTF(inputPath, outputPath);
