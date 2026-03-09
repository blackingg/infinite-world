import State from '@/State/State.js'

export default class SectionRegistry
{
    constructor()
    {
        this.state = State.getInstance()

        this.sections = new Map()
    }

    /**
     * Register a section definition
     * @param {Object} definition
     * @param {string} definition.id - Unique section identifier
     * @param {number[]} definition.position - [x, y, z] world coordinates
     * @param {number} definition.orbRadius - Distance to show orb preview
     * @param {number} definition.loadRadius - Distance to start loading .glb
     * @param {string} definition.modelPath - Path to .glb file
     * @param {string} definition.label - Display name
     * @param {string} definition.status - 'ready' | 'loading' | 'wip'
     */
    register(definition)
    {
        const section = {
            ...definition,
            orbRadiusSq: definition.orbRadius * definition.orbRadius,
            loadRadiusSq: definition.loadRadius * definition.loadRadius,
            isOrbVisible: false,
            isLoaded: false,
            isLoadRequested: false,
            model: null,
        }

        this.sections.set(definition.id, section)

        return section
    }

    unregister(id)
    {
        this.sections.delete(id)
    }

    get(id)
    {
        return this.sections.get(id)
    }

    /**
     * Get all sections within a squared distance from a position (XZ plane)
     * Uses squared distance to avoid sqrt — GPU/CPU friendly
     */
    getSectionsNear(x, z, radiusSq)
    {
        const results = []

        for(const [id, section] of this.sections)
        {
            const dx = section.position[0] - x
            const dz = section.position[2] - z
            const distSq = dx * dx + dz * dz

            if(distSq < radiusSq)
                results.push({ section, distSq })
        }

        return results
    }

    /**
     * Snap a section's Y position to the terrain elevation
     */
    snapToTerrain(id)
    {
        const section = this.sections.get(id)
        if(!section)
            return

        const elevation = this.state.chunks.getElevationForPosition(
            section.position[0],
            section.position[2]
        )

        if(elevation !== false)
            section.position[1] = elevation
    }

    /**
     * Get all registered sections
     */
    getAll()
    {
        return this.sections
    }
}
