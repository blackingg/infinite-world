import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import Game from '@/Game.js'
import View from '@/View/View.js'
import State from '@/State/State.js'
import TrunkMaterial from './Materials/TrunkMaterial.js'
import TreeFoliageMaterial from './Materials/TreeFoliageMaterial.js'
import createTreeFoliageGeometry from './Geometries/TreeFoliageGeometry.js'

export default class Trees
{
    constructor()
    {
        this.game = Game.getInstance()
        this.view = View.getInstance()
        this.state = State.getInstance()
        
        this.scene = this.view.scene
        this.loader = new GLTFLoader()
        
        const dracoLoader = new DRACOLoader()
        dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/')
        this.loader.setDRACOLoader(dracoLoader)
        
        this.pendingTerrains = new Set()
        this.chunksData = new Map()
        
        this.modelsLoaded = false
        
        this.treeTypes = [
            {
                name: 'birch',
                url: '/sources/assets/models/trees/birchTreesVisual.glb',
                colorA: '#7da832',
                colorB: '#3f6615',
                trunkColor: '#5a3a28',
            },
            {
                name: 'cherry',
                url: '/sources/assets/models/trees/cherryTreesVisual.glb',
                colorA: '#ff6285',
                colorB: '#a42340',
                trunkColor: '#4a2f26',
            }
        ]

        this.foliageGeometry = createTreeFoliageGeometry()
        
        this.loadModels()
        
        this.state.terrains.events.on('create', (terrain) =>
        {
            terrain.events.on('ready', () => this.add(terrain))
            terrain.events.on('destroy', () => this.remove(terrain))
        })
    }
    
    async loadModels()
    {
        const promises = this.treeTypes.map(type => this.loadSingleModel(type))
        await Promise.all(promises)
        
        this.modelsLoaded = true
        
        for(const terrain of this.pendingTerrains)
        {
            this.add(terrain)
        }
        this.pendingTerrains.clear()
    }
    
    loadSingleModel(typeData)
    {
        return new Promise((resolve) => {
            this.loader.load(typeData.url, (gltf) => {
                let body = null
                const leaves = []
                
                gltf.scene.traverse((child) => {
                    if(child.isMesh) {
                        if(child.name.startsWith('treeLeaves')) leaves.push(child)
                        else if(child.name.startsWith('treeBody')) body = child
                    }
                })
                
                // Use GLB geometry, fallback to cylinder
                typeData.trunkGeometry = body ? body.geometry : new THREE.CylinderGeometry(0.2, 0.3, 2, 8)
                
                // Extract trunk color from GLB material if available
                let trunkColor = typeData.trunkColor
                if(body && body.material && body.material.color)
                {
                    trunkColor = '#' + body.material.color.getHexString()
                }
                
                // Simple trunk material with proximity bleach
                typeData.trunkMaterial = new TrunkMaterial(trunkColor)
                
                // Extract leaf positions from GLB
                typeData.leafTransforms = leaves.map(l => {
                    l.updateMatrix()
                    return { matrix: l.matrix }
                })
                
                // Foliage material with proximity bleach
                typeData.foliageMaterial = new TreeFoliageMaterial(typeData.colorA, typeData.colorB)
                typeData.loaded = true
                console.log(`Loaded tree type: ${typeData.name}, body: ${body ? body.name : 'fallback'}, leaves: ${leaves.length}`)
                resolve()
            })
        })
    }

    add(terrain)
    {
        if(!this.modelsLoaded) {
            this.pendingTerrains.add(terrain)
            return
        }

        if(!terrain.trees || terrain.trees.length === 0) return
        
        const count = terrain.trees.length / 5
        
        const typeCounts = new Map()
        for(let i=0; i<this.treeTypes.length; i++) typeCounts.set(i, 0)
        
        for(let i=0; i<count; i++) {
            const type = terrain.trees[i * 5 + 4]
            typeCounts.set(type, (typeCounts.get(type) || 0) + 1)
        }
        
        const chunkMeshes = []
        
        for(let typeIndex = 0; typeIndex < this.treeTypes.length; typeIndex++) {
            const numTrees = typeCounts.get(typeIndex)
            if(numTrees === 0) continue
            
            const typeData = this.treeTypes[typeIndex]
            if(!typeData.loaded) continue

            const numLeavesPerTree = typeData.leafTransforms.length
            
            const trunkMesh = new THREE.InstancedMesh(typeData.trunkGeometry, typeData.trunkMaterial, numTrees)
            const leafMesh = new THREE.InstancedMesh(this.foliageGeometry, typeData.foliageMaterial, numTrees * numLeavesPerTree)
            
            let trunkInstIdx = 0
            let leafInstIdx = 0
            
            const dummyTrunk = new THREE.Object3D()
            const dummyLeaf = new THREE.Object3D()
            
            for(let i=0; i<count; i++) {
                const t = terrain.trees[i * 5 + 4]
                if(t !== typeIndex) continue
                
                const x = terrain.trees[i * 5 + 0]
                const y = terrain.trees[i * 5 + 1]
                const z = terrain.trees[i * 5 + 2]
                const scale = terrain.trees[i * 5 + 3]
                
                dummyTrunk.position.set(x, y, z)
                dummyTrunk.scale.set(scale, scale, scale)
                dummyTrunk.rotation.y = Math.random() * Math.PI * 2
                dummyTrunk.updateMatrix()
                
                trunkMesh.setMatrixAt(trunkInstIdx, dummyTrunk.matrix)
                trunkInstIdx++
                
                for(let l = 0; l < numLeavesPerTree; l++) {
                    const leafData = typeData.leafTransforms[l]
                    dummyLeaf.matrix.copy(leafData.matrix).premultiply(dummyTrunk.matrix)
                    leafMesh.setMatrixAt(leafInstIdx, dummyLeaf.matrix)
                    leafInstIdx++
                }
            }
            
            trunkMesh.instanceMatrix.needsUpdate = true
            leafMesh.instanceMatrix.needsUpdate = true
            
            this.scene.add(trunkMesh)
            this.scene.add(leafMesh)
            
            chunkMeshes.push(trunkMesh, leafMesh)
        }
        
        this.chunksData.set(terrain.id, chunkMeshes)
    }

    remove(terrain)
    {
        this.pendingTerrains.delete(terrain)
        
        const meshes = this.chunksData.get(terrain.id)
        if(meshes) {
            for(const mesh of meshes) {
                this.scene.remove(mesh)
                mesh.dispose()
            }
            this.chunksData.delete(terrain.id)
        }
    }

    update()
    {
        const playerPos = this.state.player.position.current

        for(let i=0; i<this.treeTypes.length; i++) {
            const typeData = this.treeTypes[i]
            if(!typeData.loaded) continue

            // Update trunk bleach position
            if(typeData.trunkMaterial) {
                typeData.trunkMaterial.uniforms.uBallPosition.value.set(playerPos[0], playerPos[1], playerPos[2])
            }

            // Update foliage
            if(typeData.foliageMaterial) {
                typeData.foliageMaterial.update()
            }
        }
    }
}
