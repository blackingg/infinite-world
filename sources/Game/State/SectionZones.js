import EventsEmitter from 'events'

import State from '@/State/State.js'

export default class SectionZones
{
    constructor()
    {
        this.state = State.getInstance()

        this.events = new EventsEmitter()

        // Broad culling radius (squared) — don't check sections beyond this
        // Set to the max orbRadius we might ever use, squared, with buffer
        this.broadCullRadiusSq = 500 * 500
    }

    update()
    {
        const player = this.state.player
        const playerX = player.position.current[0]
        const playerZ = player.position.current[2]
        const registry = this.state.sectionRegistry

        for(const [id, section] of registry.getAll())
        {
            const dx = section.position[0] - playerX
            const dz = section.position[2] - playerZ
            const distSq = dx * dx + dz * dz

            /**
             * Orb visibility zone
             */
            const wasOrbVisible = section.isOrbVisible
            const isOrbVisible = distSq < section.orbRadiusSq

            if(isOrbVisible && !wasOrbVisible)
            {
                section.isOrbVisible = true

                // Snap Y to terrain on first approach
                registry.snapToTerrain(id)

                this.events.emit('orb-enter', section)
            }
            else if(!isOrbVisible && wasOrbVisible)
            {
                section.isOrbVisible = false
                this.events.emit('orb-leave', section)
            }

            /**
             * Load zone
             */
            const wasLoadRequested = section.isLoadRequested
            const shouldLoad = distSq < section.loadRadiusSq

            if(shouldLoad && !wasLoadRequested)
            {
                section.isLoadRequested = true
                this.events.emit('load-enter', section)
            }
            else if(!shouldLoad && wasLoadRequested)
            {
                section.isLoadRequested = false
                this.events.emit('load-leave', section)
            }

            /**
             * Section walkable check
             * A section becomes walkable when it's loaded AND status is 'ready'
             */
            if(section.isLoaded && section.status === 'ready' && !section.isWalkable)
            {
                section.isWalkable = true
                this.events.emit('section-walkable', section)
            }
            else if(section.isWalkable && (!section.isLoaded || section.status !== 'ready'))
            {
                section.isWalkable = false
                this.events.emit('section-blocked', section)
            }
        }
    }
}
