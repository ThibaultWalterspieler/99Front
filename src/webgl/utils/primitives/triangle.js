import { BufferGeometry, Float32BufferAttribute } from 'three';

const geometry = new BufferGeometry();
geometry.setAttribute('position', new Float32BufferAttribute([-1, 3, 0, -1, -1, 0, 3, -1, 0], 3));
geometry.setAttribute('uv', new Float32BufferAttribute([0, 2, 0, 0, 2, 0], 2));

export default geometry;
