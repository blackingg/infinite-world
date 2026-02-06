import * as THREE from 'three'

import Game from '@/Game.js'
import View from '@/View/View.js'
import State from '@/State/State.js'

export default class Trees
{
    constructor()
    {
        this.game = Game.getInstance()
        this.view = View.getInstance()
        this.state = State.getInstance()

        this.scene = this.view.scene
        this.terrains = this.state.terrains // Access terrains manager form State

        this.minDistance = 4 // Spacing between trees
        this.maxTreesPerChunk = 50 // Max trees per chunk
        
        // Map to store tree instances per chunk key
        this.chunkTrees = new Map()

        // Total trees limit for instanced mesh
        this.maxTotalTrees = 10000 
        this.allocatedCount = 0

        this.setGeometry()
        this.setMaterial()
        this.setMeshes() // Create one large instanced mesh

        // Listen for new terrain chunks
        this.terrains.events.on('create', (terrain) => {
            this.generateTreesForChunk(terrain)
        })

        // Listen for terrain destruction to clean up
        this.terrains.events.on('destroy', (terrain) => {
            this.removeTreesForChunk(terrain)
        })
    }

    setGeometry()
    {
        // High LOD Geometry
        this.trunkGeometryHigh = new THREE.CylinderGeometry(0.3, 0.5, 5, 8)
        this.trunkGeometryHigh.translate(0, 2.5, 0)
        this.foliageGeometryHigh = new THREE.ConeGeometry(2.4, 6, 8)
        this.foliageGeometryHigh.translate(0, 8, 0)
    }

    setMaterial()
    {
        this.trunkMaterial = new THREE.MeshBasicMaterial({
            color: new THREE.Color(0.3, 0.2, 0.15)
        })
        this.foliageMaterial = new THREE.MeshBasicMaterial({
            color: new THREE.Color(0.2, 0.5, 0.2)
        })
    }

    setMeshes()
    {
        // Single large instanced mesh pool
        this.trunkMesh = new THREE.InstancedMesh(
            this.trunkGeometryHigh, 
            this.trunkMaterial, 
            this.maxTotalTrees
        )
        this.foliageMesh = new THREE.InstancedMesh(
            this.foliageGeometryHigh, 
            this.foliageMaterial, 
            this.maxTotalTrees
        )
        
        this.trunkMesh.frustumCulled = false
        this.foliageMesh.frustumCulled = false

        this.scene.add(this.trunkMesh)
        this.scene.add(this.foliageMesh)

        // Hide all initially
        const hidden = new THREE.Matrix4().makeTranslation(0, -1000, 0)
        for(let i=0; i<this.maxTotalTrees; i++) {
            this.trunkMesh.setMatrixAt(i, hidden)
            this.foliageMesh.setMatrixAt(i, hidden)
        }
        this.trunkMesh.instanceMatrix.needsUpdate = true
        this.foliageMesh.instanceMatrix.needsUpdate = true
        
        // Free slots tracking
        this.freeSlots = []
        for(let i=0; i<this.maxTotalTrees; i++) {
            this.freeSlots.push(i)
        }
    }

    hash(x, z)
    {
        const n = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453
        return n - Math.floor(n)
    }

    getBiomeValue(x, z)
    {
        const scale1 = 0.005
        const scale2 = 0.012
        const noise1 = Math.sin(x * scale1 + 1.3) * Math.cos(z * scale1 + 2.1)
        const noise2 = Math.sin(x * scale2 + 5.7) * Math.cos(z * scale2 + 3.2) * 0.5
        const noise3 = Math.sin((x + z) * scale1 * 2.0 + 4.2) * 0.2
        return noise1 + noise2 + noise3
    }
    
    localTreeDensity(x, z)
    {
        const scale = 0.04
        const noise = Math.sin(x * scale + 8.1) * Math.cos(z * scale + 4.5) * 0.5 + 0.5
        return 0.5 + noise * 0.5
    }

    generateTreesForChunk(terrain)
    {
        // Wait for terrain to be ready since ithas elevation data)
        if (!terrain.ready) {
            const checkReady = () => {
                if(terrain.ready) {
                    this.doSpawn(terrain)
                } else {
                    requestAnimationFrame(checkReady)
                }
            }
            checkReady()
            return
        }
        this.doSpawn(terrain)
    }

    doSpawn(terrain)
    {
        const chunkTreeIndices = []
        const halfSize = terrain.size * 0.5
        const startX = terrain.x - halfSize
        const startZ = terrain.z - halfSize
        const endX = terrain.x + halfSize
        const endZ = terrain.z + halfSize
        
        const matrix = new THREE.Matrix4()
        const position = new THREE.Vector3()
        const quaternion = new THREE.Quaternion()
        const scale = new THREE.Vector3()

        // Iterate grid relative to world
        // Snap to grid pattern to ensure seamless edges between chunks
        const gridSize = this.minDistance
        const gridStartX = Math.floor(startX / gridSize) * gridSize
        const gridStartZ = Math.floor(startZ / gridSize) * gridSize

        for (let x = gridStartX; x < endX; x += gridSize)
        {
            for (let z = gridStartZ; z < endZ; z += gridSize)
            {
                // Ensure point is strictly within this chunk's ownership to prevent duplicates at edges
                if(x < startX || x >= endX || z < startZ || z >= endZ) continue

                // Check biomes
                const biomeValue = this.getBiomeValue(x, z)
                const isForest = biomeValue > 0.0
                
                let spawnChance = 0
                if(isForest) {
                    const localDensity = this.localTreeDensity(x, z)
                    spawnChance = localDensity * 0.8 
                } else {
                    spawnChance = 0.015
                }

                const hash = this.hash(x, z)

                if (hash < spawnChance)
                {
                    // Random offset
                    const offsetX = (this.hash(x + 1, z) - 0.5) * gridSize * 0.8
                    const offsetZ = (this.hash(x, z + 1) - 0.5) * gridSize * 0.8
                    const treeX = x + offsetX
                    const treeZ = z + offsetZ

                    // GET PRECISE ELEVATION FROM TERRAIN
                    const elevation = terrain.getElevationForPosition(treeX, treeZ)
                    
                    if (elevation >= 0.5 && this.freeSlots.length > 0)
                    {
                        const slot = this.freeSlots.pop()
                        chunkTreeIndices.push(slot)

                        // HUGE SCALE VARIATION
                        const scaleVar = 1.5 + hash * 2.0
                        
                        position.set(treeX, elevation, treeZ)
                        quaternion.setFromEuler(new THREE.Euler(0, hash * Math.PI * 2, 0))
                        scale.set(scaleVar, scaleVar, scaleVar)
                        matrix.compose(position, quaternion, scale)

                        this.trunkMesh.setMatrixAt(slot, matrix)
                        this.foliageMesh.setMatrixAt(slot, matrix)
                    }
                }
            }
        }

        this.trunkMesh.instanceMatrix.needsUpdate = true
        this.foliageMesh.instanceMatrix.needsUpdate = true
        
        this.chunkTrees.set(terrain.id, chunkTreeIndices)
        // console.log(`Spawned ${chunkTreeIndices.length} trees for chunk ${terrain.id}`)
    }

    removeTreesForChunk(terrain)
    {
        if(terrain && this.chunkTrees.has(terrain.id))
        {
            const indices = this.chunkTrees.get(terrain.id)
            const hidden = new THREE.Matrix4().makeTranslation(0, -1000, 0)
            
            indices.forEach(index => {
                this.trunkMesh.setMatrixAt(index, hidden)
                this.foliageMesh.setMatrixAt(index, hidden)
                this.freeSlots.push(index) // Return slot to pool
            })
            
            this.trunkMesh.instanceMatrix.needsUpdate = true
            this.foliageMesh.instanceMatrix.needsUpdate = true
            this.chunkTrees.delete(terrain.id)
        }
    }

    checkCollision(position, radius)
    {
        if(!this.dummyMatrix)
        {
            this.dummyMatrix = new THREE.Matrix4()
            this.dummyVector = new THREE.Vector3()
        }

        const chunksToCheck = new Set()
        const centerChunk = this.state.chunks.getDeepestChunkForPosition(position.x, position.z)
        
        if(centerChunk && centerChunk.terrain)
        {
            chunksToCheck.add(centerChunk)
            
            // Add neighbours
            if(centerChunk.neighbours)
            {
                for(const neighbour of centerChunk.neighbours.values())
                {
                    if(neighbour && neighbour.terrain)
                        chunksToCheck.add(neighbour)
                }
            }
        }

        for(const chunk of chunksToCheck)
        {
            const indices = this.chunkTrees.get(chunk.terrain.id)
            if(!indices)
                continue

            for(const index of indices)
            {
                this.trunkMesh.getMatrixAt(index, this.dummyMatrix)
                this.dummyVector.setFromMatrixPosition(this.dummyMatrix)

                const dx = position.x - this.dummyVector.x
                const dz = position.z - this.dummyVector.z
                const distance = Math.sqrt(dx * dx + dz * dz)

                if(distance < radius + 0.3) // 0.3 is tree trunk radius approx
                {
                    return true
                }
            }
        }

        return false
    }

    update()
    {
        // No per-frame update needed since trees are static on terrain!
    }
}
