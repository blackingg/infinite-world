import * as THREE from 'three'
import { mergeBufferGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

export default function createTreeFoliageGeometry()
{
    const count = 80
    const planes = []

    for(let i = 0; i < count; i++)
    {
        const plane = new THREE.PlaneGeometry(0.8, 0.8)

        // Seeded random replacement
        const r1 = Math.random()
        const r2 = Math.random()
        const r3 = Math.random()
        const r4 = Math.random()

        // Position
        const spherical = new THREE.Spherical(
            1 - Math.pow(r1, 3),
            Math.PI * 2 * r2,
            Math.PI * r3
        )
        const position = new THREE.Vector3().setFromSpherical(spherical)

        plane.rotateZ(r4 * 9999)
        plane.rotateY(0)
        plane.translate(
            position.x,
            position.y,
            position.z
        )

        // Normal (lerping between face normal and spherical center normal to make lighting spherical)
        const normal = position.clone().normalize()
        const normalArray = new Float32Array(12)
        for(let j = 0; j < 4; j++)
        {
            const i3 = j * 3

            const pos = new THREE.Vector3(
                plane.attributes.position.array[i3    ],
                plane.attributes.position.array[i3 + 1],
                plane.attributes.position.array[i3 + 2]
            )

            const mixedNormal = pos.lerp(normal, 0.85)

            normalArray[i3    ] = mixedNormal.x
            normalArray[i3 + 1] = mixedNormal.y
            normalArray[i3 + 2] = mixedNormal.z
        }

        plane.setAttribute('normal', new THREE.BufferAttribute(normalArray, 3))

        planes.push(plane)
    }

    return mergeBufferGeometries(planes)
}
