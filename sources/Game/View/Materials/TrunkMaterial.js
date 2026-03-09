import * as THREE from 'three'
import CustomShaderMaterial from 'three-custom-shader-material/vanilla'

export default class TrunkMaterial extends CustomShaderMaterial
{
    constructor(color)
    {
        super({
            baseMaterial: THREE.MeshBasicMaterial,
            vertexShader: `
                varying vec3 vWorldPos;
                void main() {
                    vec4 wp = vec4(csm_Position, 1.0);
                    #ifdef USE_INSTANCING
                        wp = instanceMatrix * wp;
                    #endif
                    vWorldPos = (modelMatrix * wp).xyz;
                }
            `,
            fragmentShader: `
                uniform vec3 uColor;
                uniform vec3 uBallPosition;
                varying vec3 vWorldPos;
                void main() {
                    float dist = length(vWorldPos.xz - uBallPosition.xz);
                    float glow = 1.0 - smoothstep(2.0, 8.0, dist);
                    float gray = dot(uColor, vec3(0.299, 0.587, 0.114));
                    vec3 bleached = vec3(gray * 0.9);
                    csm_DiffuseColor = vec4(mix(bleached, uColor, glow), 1.0);
                }
            `,
            uniforms: {
                uColor: { value: new THREE.Color(color) },
                uBallPosition: { value: new THREE.Vector3() },
            },
        })
    }
}
