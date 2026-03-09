import * as THREE from 'three'
import CustomShaderMaterial from 'three-custom-shader-material/vanilla'
import vertexShader from './shaders/treeFoliage/vertex.glsl'
import fragmentShader from './shaders/treeFoliage/fragment.glsl'
import State from '@/State/State.js'

export default class TreeFoliageMaterial extends CustomShaderMaterial
{
    constructor(colorA, colorB)
    {
        const state = State.getInstance()
        super({
            baseMaterial: THREE.MeshBasicMaterial,
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            uniforms: {
                uTime: { value: 0 },
                uFoliageTexture: { value: new THREE.DataTexture(new Uint8Array([255]), 1, 1, THREE.RedFormat) },
                uColorA: { value: new THREE.Color(colorA) },
                uColorB: { value: new THREE.Color(colorB) },
                uLightDirection: { value: new THREE.Vector3(0.5, 1.0, 0.5).normalize() },
                uBallPosition: { value: new THREE.Vector3() },
            },
            transparent: true,
            alphaTest: 0.3,
            depthWrite: true,
            side: THREE.DoubleSide
        })

        const textureLoader = new THREE.TextureLoader()
        textureLoader.load('/sources/assets/textures/foliageSDF.png', (texture) => {
            // foliageSDF is a mask, standard colorSpace is fine, but needs to be linear for exact threshold
            texture.colorSpace = THREE.NoColorSpace
            this.uniforms.uFoliageTexture.value = texture
            this.needsUpdate = true
        })
    }
    
    update() {
        const state = State.getInstance()
        this.uniforms.uTime.value = state.time.elapsed

        const playerPos = state.player.position.current
        this.uniforms.uBallPosition.value.set(playerPos[0], playerPos[1], playerPos[2])
    }
}
