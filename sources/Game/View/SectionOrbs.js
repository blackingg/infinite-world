import * as THREE from 'three'

import Game from '@/Game.js'
import View from '@/View/View.js'
import State from '@/State/State.js'
import SectionOrbMaterial from './Materials/SectionOrbMaterial.js'

export default class SectionOrbs
{
    constructor()
    {
        this.game = Game.getInstance()
        this.view = View.getInstance()
        this.state = State.getInstance()

        this.scene = this.view.scene

        this.maxOrbs = 16
        this.orbScale = 1.5

        this.geometry = new THREE.SphereGeometry(1, 16, 16)
        this.material = SectionOrbMaterial()

        this.mesh = new THREE.InstancedMesh(this.geometry, this.material, this.maxOrbs)
        this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
        this.mesh.count = 0
        this.mesh.frustumCulled = false
        this.scene.add(this.mesh)

        // Track which sections have orb instances
        this.orbMap = new Map() // section.id -> instanceIndex
        this.dummy = new THREE.Object3D()

        // Listen to zone events
        const zones = this.state.sectionZones

        zones.events.on('orb-enter', (section) =>
        {
            this.addOrb(section)
        })

        zones.events.on('orb-leave', (section) =>
        {
            this.removeOrb(section)
        })

        // When section becomes walkable (loaded + ready), hide the orb
        zones.events.on('section-walkable', (section) =>
        {
            this.removeOrb(section)
        })

        // When section becomes blocked again, show orb if in range
        zones.events.on('section-blocked', (section) =>
        {
            if(section.isOrbVisible)
                this.addOrb(section)
        })
    }

    addOrb(section)
    {
        // Don't show orb if section is already walkable
        if(section.isWalkable)
            return

        if(this.orbMap.has(section.id))
            return

        const index = this.mesh.count
        if(index >= this.maxOrbs)
            return

        this.orbMap.set(section.id, { index, section })
        this.mesh.count++

        this.updateOrbMatrix(section, index)
    }

    removeOrb(section)
    {
        const orb = this.orbMap.get(section.id)
        if(!orb)
            return

        const lastIndex = this.mesh.count - 1

        // Swap with last instance if not already last
        if(orb.index !== lastIndex)
        {
            // Find the section that owns the last index
            let lastSection = null
            for(const [id, o] of this.orbMap)
            {
                if(o.index === lastIndex)
                {
                    lastSection = o
                    break
                }
            }

            if(lastSection)
            {
                // Copy last instance matrix to the removed slot
                const matrix = new THREE.Matrix4()
                this.mesh.getMatrixAt(lastIndex, matrix)
                this.mesh.setMatrixAt(orb.index, matrix)
                lastSection.index = orb.index
            }
        }

        this.orbMap.delete(section.id)
        this.mesh.count--
        this.mesh.instanceMatrix.needsUpdate = true
    }

    updateOrbMatrix(section, index)
    {
        const elevation = this.state.chunks.getElevationForPosition(
            section.position[0],
            section.position[2]
        )
        const baseY = elevation !== false ? elevation : section.position[1]

        this.dummy.position.set(
            section.position[0],
            baseY - 7,
            section.position[2]
        )
        this.dummy.scale.setScalar(this.orbScale)
        this.dummy.rotation.y = 0

        this.dummy.updateMatrix()
        this.mesh.setMatrixAt(index, this.dummy.matrix)
        this.mesh.instanceMatrix.needsUpdate = true
    }

    update()
    {
        if(this.mesh.count === 0)
            return

        // MeshStandardMaterial — no custom uniforms needed

        // Gently rotate all orbs by updating matrices
        for(const [id, orb] of this.orbMap)
        {
            // Live-snap Y to terrain so orb doesn't get buried
            const elevation = this.state.chunks.getElevationForPosition(
                orb.section.position[0],
                orb.section.position[2]
            )
            const baseY = elevation !== false ? elevation : orb.section.position[1]

            this.dummy.position.set(
                orb.section.position[0],
                baseY + 1.5 + Math.sin(this.state.time.elapsed * 1.5) * 0.15,
                orb.section.position[2]
            )
            this.dummy.scale.setScalar(this.orbScale)
            this.dummy.rotation.y = this.state.time.elapsed * 0.5

            this.dummy.updateMatrix()
            this.mesh.setMatrixAt(orb.index, this.dummy.matrix)
        }

        this.mesh.instanceMatrix.needsUpdate = true
    }
}
