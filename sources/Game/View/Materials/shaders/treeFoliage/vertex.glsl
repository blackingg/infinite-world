varying vec2 vUv;
varying vec3 vPositionLocal;
varying vec3 vWorldPosition;

void main()
{
    vUv = uv;
    vPositionLocal = position;
    
    vec4 worldPos = vec4(csm_Position, 1.0);
    #ifdef USE_INSTANCING
        worldPos = instanceMatrix * worldPos;
    #endif
    vWorldPosition = (modelMatrix * worldPos).xyz;
}
