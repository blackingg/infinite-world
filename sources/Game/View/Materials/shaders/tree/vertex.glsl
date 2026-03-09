uniform float uTime;
uniform float uWiggleStrength;
uniform float uWiggleSpeed;
uniform sampler2D uNoiseTexture;

varying vec3 vWorldPosition;
varying vec2 vUv;

float csm_noiseTex(vec2 p) {
  return texture2D(uNoiseTexture, p).r;
}

void main() {
  csm_Position = position;
  vUv = uv;
  vec4 worldPos = vec4(csm_Position, 1.0);
  #ifdef USE_INSTANCING
    worldPos = instanceMatrix * worldPos;
  #endif
  vWorldPosition = (modelMatrix * worldPos).xyz;
}
