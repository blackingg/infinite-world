
import * as THREE from 'three'
import CustomShaderMaterial from 'three-custom-shader-material/vanilla'
import vertexShader from './shaders/tree/vertex.glsl'
import fragmentShader from './shaders/tree/fragment.glsl'

export default class TreeMaterial extends CustomShaderMaterial
{
    constructor()
    {
        super({
            baseMaterial: THREE.MeshStandardMaterial,
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            uniforms: {
                uTime: { value: 0 },
                uWiggleStrength: { value: 0 },
                uWiggleSpeed: { value: 0 },
                uNoiseTexture: { value: null },
                uFresnelPower: { value: 2.0 },
                uFresnelStrength: { value: 1.0 },
                uFresnelColor: { value: new THREE.Color('#ffffff') },
                uBaseColor: { value: new THREE.Color('#332a22') },
                uCircleCenter: { value: new THREE.Vector3() },
                uChunkSize: { value: 40 },
                uNoiseStrength: { value: 0 },
                uNoiseScale: { value: 0 },
                uCircleRadiusFactor: { value: 0 },
                uGrassFadeOffset: { value: 0 },
                uBorderTreesMultiplier: { value: 0 },
                uBallPosition: { value: new THREE.Vector3() },
                uBallFadeRadius: { value: 0 },
                uBallFadeWidth: { value: 0 },
                uBallNoiseScale: { value: 0 },
                uBallNoiseStrength: { value: 0 },
                uBallFadeMax: { value: 0 },
                uPixelSize: { value: 1.0 },
                uDitherMode: { value: 0 }
            },
            transparent: false
        })
    }
}
