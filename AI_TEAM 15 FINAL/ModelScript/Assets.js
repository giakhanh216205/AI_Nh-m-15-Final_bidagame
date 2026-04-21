class Assets {
    constructor() {
        this.images = {}; 
        this.sounds = {}; 

        this.imagePaths = {
            board: "../../Assets/Image/background_Game.png",
            stick: "../../Assets/Image/stick.png"
        };

        this.soundPaths = {
            strike: "../../Assets/Sounds/Strike.wav",
            side: "../../Assets/Sounds/Side.wav",
            hole: "../../Assets/Sounds/Hole.wav",
            ballCollide: "../../Assets/Sounds/BallsCollide.wav",
        };
    }

    playSound(key, volume = 1.0) {
        if (this.sounds[key]) {
            let soundClone = this.sounds[key].cloneNode();
            soundClone.volume = Math.max(0, Math.min(1, volume));
            soundClone.play().catch(error => {
                console.error(`Error playing sound ${key}:`, error);
            });
        }
    }

    loadImage(key, path) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = path;
            img.onload = () => {
                this.images[key] = img;
                resolve(img);
            };
            img.onerror = reject;
        });
    }

    loadSound(key, path) {
        return new Promise((resolve, reject) => {
            const audio = new Audio(path);
            audio.oncanplaythrough = () => {
                this.sounds[key] = audio;
                resolve(audio);
            };
            audio.onerror = reject;
        });
    }

    preLoad() {
        const imagePromises = Object.entries(this.imagePaths).map(([key, path]) => this.loadImage(key, path));
        const soundPromises = Object.entries(this.soundPaths).map(([key, path]) => this.loadSound(key, path));
        
        return Promise.all([...imagePromises, ...soundPromises]);
    }
}