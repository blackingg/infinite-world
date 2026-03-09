import * as THREE from 'three'

import View from '@/View/View.js'
import State from '@/State/State.js'

export default class SectionMeshes
{
    constructor()
    {
        this.view = View.getInstance()
        this.state = State.getInstance()

        this.scene = this.view.scene
        this.groups = new Map() // section.id -> THREE.Group

        // Listen to loader events
        const loader = this.state.sectionLoader

        loader.events.on('section-ready', (section) =>
        {
            this.add(section)
        })

        loader.events.on('section-removed', (section) =>
        {
            this.remove(section)
        })
    }

    add(section)
    {
        if(this.groups.has(section.id))
            return

        if(!section.model)
            return

        // Create a group wrapper positioned at the section's coordinates
        const group = new THREE.Group()
        group.position.set(
            section.position[0],
            section.position[1],
            section.position[2]
        )

        // Add the loaded model
        group.add(section.model)

        // Disable shadow casting/receiving for GPU performance
        group.traverse((child) =>
        {
            if(child.isMesh)
            {
                child.castShadow = false
                child.receiveShadow = false
            }
        })

        this.scene.add(group)
        this.groups.set(section.id, group)
    }

    remove(section)
    {
        const group = this.groups.get(section.id)
        if(!group)
            return

        this.scene.remove(group)
        this.groups.delete(section.id)

        // Note: GPU resource disposal is handled by SectionLoader.disposeModel()
    }
}
