import * as THREE from 'three'

export default function SectionOrbMaterial()
{
    const material = new THREE.MeshBasicMaterial({
        color: '#4fc3f7',
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
    })

    return material
}
