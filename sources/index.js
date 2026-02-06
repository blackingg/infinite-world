import Game from '@/Game.js'

const game = new Game()

if(game.view)
    document.querySelector('.game').append(game.view.renderer.instance.domElement)

const loadingScreen = document.querySelector('.loading-screen')
const logs = loadingScreen?.querySelector('.logs')

if(loadingScreen && logs && game.state && game.state.terrains)
{
    const logTerrain = (terrain) => {
        logs.textContent = `Generating chunk ${terrain.id} at ${terrain.x}, ${terrain.z}...`
    }

    // Hook into future events
    game.state.terrains.events.on('create', logTerrain)

    // Check existing
    if(game.state.terrains.terrains.size > 0)
    {
        for(const [id, terrain] of game.state.terrains.terrains)
        {
            logTerrain(terrain)
        }
    }

    // Wait for initial generation
    setTimeout(() => {
        logs.textContent = "Finalizing terrain..."
        
        setTimeout(() => {
            loadingScreen.classList.add('fade-out')
            setTimeout(() => {
                loadingScreen.remove()
            }, 1000)
        }, 500)
    }, 2500)
}