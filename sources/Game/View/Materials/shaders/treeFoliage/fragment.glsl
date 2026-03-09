uniform float uTime;
uniform sampler2D uFoliageTexture;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uLightDirection;
uniform vec3 uBallPosition;

varying vec2 vUv;
varying vec3 vPositionLocal;
varying vec3 vWorldPosition;

#include ../partials/getProximityBleach.glsl

vec2 rotateUV(vec2 uv, float rotation, vec2 mid)
{
    return vec2(
        cos(rotation) * (uv.x - mid.x) + sin(rotation) * (uv.y - mid.y) + mid.x,
        cos(rotation) * (uv.y - mid.y) - sin(rotation) * (uv.x - mid.x) + mid.y
    );
}

void main()
{
    float windStrength = sin(vWorldPosition.x * 0.1 + uTime * 0.002) * cos(vWorldPosition.z * 0.1 + uTime * 0.002);
    vec2 rotatedUv = rotateUV(vUv, windStrength * 0.5, vec2(0.5));

    float sdf = texture2D(uFoliageTexture, rotatedUv).r;

    if(sdf < 0.3)
    {
        discard;
    }

    // Mix colors based on local height
    float mixStrength = smoothstep(-0.4, 0.4, vPositionLocal.y);
    vec3 mixedColor = mix(uColorA, uColorB, mixStrength);

    // Apply proximity bleach hook
    vec3 finalColor = getProximityBleach(mixedColor, vWorldPosition, uBallPosition, 2.0, 8.0);

    csm_DiffuseColor = vec4(finalColor, 1.0);
}
