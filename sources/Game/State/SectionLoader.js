import EventsEmitter from 'events'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

import State from '@/State/State.js'

export default class SectionLoader
{
    constructor()
    {
        this.state = State.getInstance()

        this.events = new EventsEmitter()
        this.loader = new GLTFLoader()
        this.maxConcurrent = 2
        this.activeLoads = 0
        this.queue = []

        // Listen to zone events
        const zones = this.state.sectionZones

        zones.events.on('load-enter', (section) =>
        {
            this.requestLoad(section)
        })

        zones.events.on('load-leave', (section) =>
        {
            this.requestUnload(section)
        })
    }

    requestLoad(section)
    {
        if(section.isLoaded || section.status === 'wip')
            return

        if(this.activeLoads >= this.maxConcurrent)
        {
            // Queue it
            if(!this.queue.includes(section))
                this.queue.push(section)
            return
        }

        this.load(section)
    }

    load(section)
    {
        this.activeLoads++
        section.status = 'loading'

        this.loader.load(
            section.modelPath,
            (gltf) =>
            {
                this.activeLoads--

                // Check if the section was unloaded while we were loading
                if(!section.isLoadRequested)
                {
                    this.disposeModel(gltf.scene)
                    this.processQueue()
                    return
                }

                section.model = gltf.scene
                section.isLoaded = true
                section.status = 'ready'

                this.events.emit('section-ready', section)
                this.processQueue()
            },
            undefined,
            (error) =>
            {
                console.warn(`Failed to load section "${section.id}":`, error)
                this.activeLoads--
                section.status = 'wip' // Mark as WIP so it doesn't retry
                this.processQueue()
            }
        )
    }

    requestUnload(section)
    {
        // Remove from queue if queued
        const queueIndex = this.queue.indexOf(section)
        if(queueIndex !== -1)
            this.queue.splice(queueIndex, 1)

        if(!section.isLoaded)
            return

        this.unload(section)
    }

    unload(section)
    {
        if(section.model)
        {
            this.disposeModel(section.model)
            section.model = null
        }

        section.isLoaded = false
        section.isWalkable = false

        this.events.emit('section-removed', section)
    }

    /**
     * Aggressively dispose all GPU resources from a loaded model
     */
    disposeModel(object)
    {
        object.traverse((child) =>
        {
            if(child.isMesh)
            {
                if(child.geometry)
                    child.geometry.dispose()

                if(child.material)
                {
                    if(Array.isArray(child.material))
                    {
                        for(const material of child.material)
                            this.disposeMaterial(material)
                    }
                    else
                    {
                        this.disposeMaterial(child.material)
                    }
                }
            }
        })
    }

    disposeMaterial(material)
    {
        // Dispose all texture maps
        const textureKeys = [
            'map', 'normalMap', 'roughnessMap', 'metalnessMap',
            'aoMap', 'emissiveMap', 'alphaMap', 'envMap',
            'lightMap', 'bumpMap', 'displacementMap'
        ]

        for(const key of textureKeys)
        {
            if(material[key])
                material[key].dispose()
        }

        material.dispose()
    }

    processQueue()
    {
        while(this.queue.length > 0 && this.activeLoads < this.maxConcurrent)
        {
            const section = this.queue.shift()

            // Only load if still requested
            if(section.isLoadRequested)
                this.load(section)
        }
    }
}
