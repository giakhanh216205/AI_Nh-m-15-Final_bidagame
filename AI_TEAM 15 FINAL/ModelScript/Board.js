class Board {
    constructor() {
        this.img = PoolGame.getInstance().assets.images["board"];
        
        this.width = this.img.width;
        this.height = this.img.height;

        this.HolePosition = [
            new Vector2D(60, 60),
            new Vector2D(this.width - 60, 60),
            new Vector2D(60, this.height - 60),
            new Vector2D(this.width - 60, this.height - 60),
            new Vector2D(this.width / 2, 35),
            new Vector2D(this.width / 2, this.height - 35)
        ];
        
        this.HoleRadius = 60;

        this.topWall = 85;
        this.leftWall = 85;
        this.bottomWall = 85;
        this.rightWall = 85;

        let W = this.width;
        let H = this.height;
        this.lines = [
            { p1: new Vector2D(135, 85), p2: new Vector2D(W / 2 - 45, 85) },
            { p1: new Vector2D(W / 2 + 45, 85), p2: new Vector2D(W - 135, 85) },
            { p1: new Vector2D(135, H - 85), p2: new Vector2D(W / 2 - 45, H - 85) },
            { p1: new Vector2D(W / 2 + 45, H - 85), p2: new Vector2D(W - 135, H - 85) },
            { p1: new Vector2D(85, 135), p2: new Vector2D(85, H - 135) },
            { p1: new Vector2D(W - 85, 135), p2: new Vector2D(W - 85, H - 135) },
            
            { p1: new Vector2D(135, 85), p2: new Vector2D(85, 35) },
            { p1: new Vector2D(85, 135), p2: new Vector2D(35, 85) },
            { p1: new Vector2D(W - 135, 85), p2: new Vector2D(W - 85, 35) },
            { p1: new Vector2D(W - 85, 135), p2: new Vector2D(W - 35, 85) },
            { p1: new Vector2D(85, H - 135), p2: new Vector2D(35, H - 85) },
            { p1: new Vector2D(135, H - 85), p2: new Vector2D(85, H - 35) },
            { p1: new Vector2D(W - 85, H - 135), p2: new Vector2D(W - 35, H - 85) },
            { p1: new Vector2D(W - 135, H - 85), p2: new Vector2D(W - 85, H - 35) },
            { p1: new Vector2D(W / 2 - 45, 85), p2: new Vector2D(W / 2 - 25, 35) },
            { p1: new Vector2D(W / 2 + 45, 85), p2: new Vector2D(W / 2 + 25, 35) },
            { p1: new Vector2D(W / 2 - 45, H - 85), p2: new Vector2D(W / 2 - 25, H - 35) },
            { p1: new Vector2D(W / 2 + 45, H - 85), p2: new Vector2D(W / 2 + 25, H - 35) }
        ];

        Object.freeze(this);
    }

    draw() {
        PoolGame.getInstance().myCanvas.DrawImage(this.img, new Vector2D(0, 0), 0);
    }
}