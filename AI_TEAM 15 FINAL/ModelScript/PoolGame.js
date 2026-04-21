const GameState = { PLAY: 1, PAUSE: 2, OVER: 3 };

class PoolGame {
    constructor() {
        PoolGame.instance = this;
        this.assets = new Assets();
        this.myCanvas = new MyCanvas();
        this.state = GameState.PLAY;
    }
    
    static getInstance() {
        return PoolGame.instance;
    }
    
    init() {
        this.assets.preLoad().then(() => {
            this.gameWorld = new GameWorld();
            requestAnimationFrame(() => this.gameWorld.gameLoop());
        }).catch(err => {
            console.error(err);
        });
    }

    pause() {
        if (this.state === GameState.PLAY) {
            this.state = GameState.PAUSE;
        }
    }

    resume() {
        if (this.state === GameState.PAUSE) {
            this.state = GameState.PLAY;
            if (this.gameWorld) this.gameWorld.lastTime = Date.now();
        }
    }
}