varying vec4 vMvPos;
varying vec3 vWorldPos;
varying vec3 vViewDirection;
varying vec2 vUv;

void main() {
    vec3 worldPos = (modelMatrix * vec4(position, 1.0)).xyz;
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPos;

    vMvPos = mvPos;
    vWorldPos = worldPos;
    vViewDirection = normalize(cameraPosition - worldPos);
    vUv = uv;
}