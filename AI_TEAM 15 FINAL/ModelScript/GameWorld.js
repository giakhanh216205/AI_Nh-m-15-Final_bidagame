class GameWorld {
    constructor() {
        this.board = new Board();
        this.width = this.board.width;
        this.height = this.board.height;
        let headX = 85 + (this.width - 170) * 0.25;
        let footX = 85 + (this.width - 170) * 0.75;
        let centerY = this.height / 2;
        this.initWhiteBallPos = Object.freeze(new Vector2D(headX, centerY));
        this.whiteBall = new Ball(this.initWhiteBallPos, 0); 
        this.solids = [];
        this.stripes = [];
        this.eightBall = null;
        this.AllBalls = [];
        const params = new URLSearchParams(window.location.search);
        this.gameType = params.get("type") || "8ball";
        if (this.gameType === '9ball') {
            this.create9BallDiamond(new Vector2D(footX, centerY), 20);
        } else {
            this.create8BallTriangle(new Vector2D(footX, centerY), 20);
        }
        this.redBall = this.solids;
        this.yellowBall = this.stripes;
        this.stick = new Stick(this.whiteBall);
        this.bot = new Bot();
        this.gamePolicy = new GamePolicy(this);
        this.size = new Vector2D(this.width, this.height);
        this.isBotOn = this.IsBotOn();
        this.isDraggingWhiteBall = false;
        this.mousedownPos = null;
        this.spin = new Vector2D(0, 0);
        this.botState = 'IDLE';
        this.botTargetShot = null;
        this.initEventListeners();
        this.lastTime = Date.now();
    }

    IsBotOn() {
        const url = window.location.href;
        const urlObj = new URL(url);
        const params = new URLSearchParams(urlObj.search);
        const mode = params.get("mode");
        if (mode == "pvp") return false;
        else return true;
    }

    botProcess(dt) {
        try {
            if (this.botState === 'IDLE') {
                if (this.gamePolicy.isFoul || this.gamePolicy.isBreak) {
                    this.whiteBall.position = new Vector2D(85 + (this.width - 170) * 0.25, this.height / 2);
                    this.stick.whiteBall = this.whiteBall;
                    this.gamePolicy.isFoul = false;
                    this.gamePolicy.isBreak = false;
                }
                this.botTargetShot = this.bot.takeShot();
                if (!this.botTargetShot || isNaN(this.botTargetShot.angle)) {
                    this.botTargetShot = { angle: 0, power: 80, holeIndex: 0 };
                }
                this.botState = 'AIMING';
            } else if (this.botState === 'AIMING') {
                let diff = this.botTargetShot.angle - this.stick.angle;
                if (isNaN(diff)) {
                    this.stick.setAngle(this.botTargetShot.angle);
                    this.botState = 'CHARGING';
                } else {
                    diff = ((diff + 180) % 360 + 360) % 360 - 180;
                    let rotSpeed = 70 * (dt / 1000); 
                    if (Math.abs(diff) <= rotSpeed) {
                        this.stick.setAngle(this.botTargetShot.angle);
                        this.botState = 'CHARGING';
                    } else {
                        this.stick.setAngle(this.stick.angle + Math.sign(diff) * rotSpeed);
                    }
                }
            } else if (this.botState === 'CHARGING') {
                let chargeSpeed = 90 * (dt / 1000); 
                let targetPower = this.botTargetShot.power || 80;
                if (this.stick.power >= targetPower) {
                    this.stick.power = targetPower;
                    if (this.gamePolicy.isCallPocketRequired()) {
                        this.gamePolicy.selectedHoleIndex = this.botTargetShot.holeIndex || 0;
                    }
                    this.stick.shoot();
                    this.botState = 'IDLE';
                } else {
                    this.stick.setPower(this.stick.power + chargeSpeed);
                }
            }
        } catch (e) {
            this.stick.setAngle(0);
            this.stick.setPower(80);
            this.stick.shoot();
            this.botState = 'IDLE';
        }
    }

    update() {
        let curTime = Date.now();
        let deltaTime = curTime - this.lastTime;
        deltaTime = Math.min(deltaTime, 1000 / 24.0);
        deltaTime = Math.max(deltaTime, 1);
        this.lastTime = curTime;

        if (this.isBotOn && this.gamePolicy.turn === 2 && !this.gamePolicy.lockInput && PoolGame.getInstance().state === GameState.PLAY) {
            this.botProcess(deltaTime);
        } else if (this.gamePolicy.turn === 1) {
            this.botState = 'IDLE';
        }

        if (!this.gamePolicy.isFoul) { 
            let subSteps = 10;
            let subDelta = deltaTime / subSteps;
            for (let step = 0; step < subSteps; step++) {
                for (let i = 0; i < this.AllBalls.length; i++) {
                    if (this.AllBalls[i].isInHole) continue;
                    this.AllBalls[i].update(subDelta);
                    for (let j = i + 1; j < this.AllBalls.length; j++) {
                        if (this.AllBalls[j].isInHole) continue;
                        this.AllBalls[i].CollideBall(this.AllBalls[j]);
                    }
                    this.AllBalls[i].CollideWall();
                    this.AllBalls[i].CollideHole();
                }
            }
        }
        this.gamePolicy.update();
    }

    draw() {
        PoolGame.getInstance().myCanvas.ClearFrame();
        this.board.draw();
        let ctx = PoolGame.getInstance().myCanvas.context;
        let scale = PoolGame.getInstance().myCanvas.getScale();
        let offset = PoolGame.getInstance().myCanvas.getOffset();
        if (this.gameType === '8ball' && this.gamePolicy.isCallPocketRequired() && !this.gamePolicy.lockInput) {
            if (this.gamePolicy.selectedHoleIndex === null) {
                this.board.HolePosition.forEach((holePos) => {
                    let hPos = holePos.multiply(scale).add(offset);
                    ctx.save();
                    ctx.beginPath();
                    ctx.arc(hPos.x, hPos.y, this.board.HoleRadius * scale * 1.1, 0, Math.PI * 2);
                    ctx.strokeStyle = `rgba(255, 255, 255, ${0.3 + Math.sin(Date.now() / 150) * 0.2})`;
                    ctx.lineWidth = 4 * scale;
                    ctx.stroke();
                    ctx.restore();
                });
            } else {
                let holePos = this.board.HolePosition[this.gamePolicy.selectedHoleIndex].multiply(scale).add(offset);
                ctx.save();
                ctx.beginPath();
                ctx.arc(holePos.x, holePos.y, this.board.HoleRadius * scale * 1.1, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(255, 192, 45, ${0.5 + Math.sin(Date.now() / 100) * 0.3})`;
                ctx.lineWidth = 6 * scale;
                ctx.stroke();
                ctx.restore();
            }
        }
        if (this.gamePolicy.isBreak) {
            let headX = (85 + (this.width - 170) * 0.25) * scale + offset.x;
            let topY = 85 * scale + offset.y;
            let botY = (this.height - 85) * scale + offset.y;
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(headX, topY);
            ctx.lineTo(headX, botY);
            ctx.lineWidth = 2 * scale;
            ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
            ctx.setLineDash([10, 5]);
            ctx.stroke();
            ctx.restore();
        }
        for (let ball of this.AllBalls) {
            if (ball.isInHole) continue;
            ball.draw();
        }
        let isPlacementMode = this.gamePolicy.isFoul || this.gamePolicy.isBreak;
        let hideStickForCallPocket = this.gamePolicy.isCallPocketRequired() && this.gamePolicy.selectedHoleIndex === null;
        if (isPlacementMode && !this.gamePolicy.lockInput && !this.isDraggingWhiteBall) {
            let pos = this.whiteBall.position.multiply(scale).add(offset);
            let R = this.whiteBall.radius * scale;
            ctx.save();
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, R * (1.5 + Math.sin(Date.now() / 200) * 0.2), 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
            ctx.lineWidth = 3 * scale;
            ctx.stroke();
            ctx.restore();
        }
        if (!this.gamePolicy.lockInput && !this.isDraggingWhiteBall && !hideStickForCallPocket) {
            if (!isPlacementMode || this.isValidPlacement(this.whiteBall.position)) {
                this.stick.draw();
            }
        }

        let powerPercent = hideStickForCallPocket ? 0 : (this.stick.power / 200) * 100;
        let powerIds = ['power-bar-fill', 'power-fill', 'powerFill', 'power_fill', 'power', 'power-inner'];
        for (let id of powerIds) {
            let el = document.getElementById(id);
            if (el) el.style.height = `${powerPercent}%`;
        }
        let powerClasses = document.getElementsByClassName('power-fill');
        for (let el of powerClasses) {
            el.style.height = `${powerPercent}%`;
        }
    }

    updateWhiteBallPos(pos) {
        let R = this.whiteBall.radius;
        let board = this.board;
        let minX = board.leftWall + R;
        let maxX = board.width - board.rightWall - R;
        let minY = board.topWall + R;
        let maxY = board.height - board.bottomWall - R;
        if (this.gamePolicy.isBreak) {
            let headX = 85 + (board.width - 170) * 0.25;
            maxX = headX;
        }
        pos.x = Math.max(minX, Math.min(pos.x, maxX));
        pos.y = Math.max(minY, Math.min(pos.y, maxY));
        this.whiteBall.position = pos;
    }

    isValidPlacement(pos) {
        let R = this.whiteBall.radius;
        for (let ball of this.AllBalls) {
            if (ball.isInHole || ball === this.whiteBall) continue;
            if (pos.distanceFrom(ball.position) <= R * 2.1) return false;
        }
        for (let hole of this.board.HolePosition) {
            if (pos.distanceFrom(hole) <= this.board.HoleRadius + 5) return false; 
        }
        return true;
    }

    handleKeyInput(event) {
        if (PoolGame.getInstance().state !== GameState.PLAY) return;
        if (this.gamePolicy.lockInput) return; 
        if (this.gamePolicy.turn == 2 && this.isBotOn) return; 
        var keyCode = event.code;
        if (this.gamePolicy.isCallPocketRequired() && this.gamePolicy.selectedHoleIndex === null) {
            if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space", "Enter"].includes(keyCode)) return; 
        }
        let isPlacementMode = this.gamePolicy.isFoul || this.gamePolicy.isBreak;
        if (isPlacementMode) {
            let step = 5;
            let newPos = this.whiteBall.position.copy();
            if (keyCode === "KeyA") newPos.x -= step;
            if (keyCode === "KeyD") newPos.x += step;
            if (keyCode === "KeyW") newPos.y -= step;
            if (keyCode === "KeyS") newPos.y += step;
            if (newPos.x !== this.whiteBall.position.x || newPos.y !== this.whiteBall.position.y) {
                this.updateWhiteBallPos(newPos);
                return; 
            }
        }
        switch (keyCode) {
            case "ArrowLeft": this.stick.downAngle(); break;
            case "ArrowRight": this.stick.upAngle(); break;
            case "ArrowUp": this.stick.upPower(); break;
            case "ArrowDown": this.stick.downPower(); break;
            case "Space": case "Enter":
                if (this.stick.power == 0) break;
                if (isPlacementMode) {
                    if (!this.isValidPlacement(this.whiteBall.position)) break;
                    this.gamePolicy.isFoul = false;
                }
                this.stick.shoot();
                break;
        }
    }

    handleMouseInput(event) {
        if (PoolGame.getInstance().state !== GameState.PLAY) return;
        if (this.gamePolicy.lockInput) return; 
        if (this.gamePolicy.turn == 2 && this.isBotOn) return; 
        let type = event.type;
        let rect = PoolGame.getInstance().myCanvas.canvas.getBoundingClientRect();
        let pos = new Vector2D(event.clientX - rect.left, event.clientY - rect.top)
            .subtract(PoolGame.getInstance().myCanvas.getOffset())
            .divide(PoolGame.getInstance().myCanvas.getScale());
        switch (type) {
            case "mousedown":
                if (this.gamePolicy.isCallPocketRequired()) {
                    for (let i = 0; i < this.board.HolePosition.length; i++) {
                        if (pos.distanceFrom(this.board.HolePosition[i]) < this.board.HoleRadius) {
                            this.gamePolicy.selectedHoleIndex = i;
                            return;
                        }
                    }
                }
                if ((this.gamePolicy.isFoul || this.gamePolicy.isBreak) && pos.distanceFrom(this.whiteBall.position) <= this.whiteBall.radius * 2.5) {
                    this.isDraggingWhiteBall = true;
                } else {
                    if ((this.gamePolicy.isFoul || this.gamePolicy.isBreak) && !this.isValidPlacement(this.whiteBall.position)) break;
                    this.mousedownPos = pos;
                }
                break;
            case "mousemove":
                if (this.isDraggingWhiteBall) this.updateWhiteBallPos(pos);
                else if (this.mousedownPos) {
                    if (this.gamePolicy.isCallPocketRequired() && this.gamePolicy.selectedHoleIndex === null) return;
                    let temp = this.mousedownPos.subtract(pos);
                    this.stick.setAngle(-temp.angle() / Math.PI * 180);
                    this.stick.setPower(temp.magnitude() - 20);
                }
                break;
            case "mouseup":
                this.isDraggingWhiteBall = false;
                if (this.mousedownPos) {
                    this.mousedownPos = null;
                    if (this.gamePolicy.isCallPocketRequired() && this.gamePolicy.selectedHoleIndex === null) {
                        this.stick.resetPower(); break;
                    }
                    if (this.stick.power == 0) break;
                    if (this.gamePolicy.isFoul || this.gamePolicy.isBreak) {
                        if (!this.isValidPlacement(this.whiteBall.position)) { this.stick.resetPower(); break; }
                        this.gamePolicy.isFoul = false;
                    }
                    this.stick.shoot();
                }
                break;
        }
    }

    create8BallTriangle(startPos, ballRadius) { 
        let pattern = [[1], [9, 2], [10, 8, 3], [11, 4, 12, 5], [6, 13, 14, 7, 15]];
        for (let i = 0; i < pattern.length; i++) {
            let xOffset = i * ballRadius * Math.sqrt(3) * 1.05; 
            let startY = startPos.y - (i * ballRadius * 1.05); 
            for (let j = 0; j <= i; j++) {
                let number = pattern[i][j];
                let x = startPos.x + xOffset;
                let y = startY + j * (2 * ballRadius * 1.05); 
                let newBall = new Ball(new Vector2D(x, y), number);
                if (number === 8) this.eightBall = newBall;
                else if (number < 8) this.solids.push(newBall);
                else this.stripes.push(newBall);
                this.AllBalls.push(newBall);
            }
        }
        this.AllBalls.push(this.whiteBall);
    }

    create9BallDiamond(startPos, ballRadius) {
        let pattern = [[1], [2, 3], [4, 9, 5], [6, 7], [8]];
        for (let i = 0; i < pattern.length; i++) {
            let xOffset = i * ballRadius * Math.sqrt(3) * 1.05;
            let startY = startPos.y - ((pattern[i].length - 1) * ballRadius * 1.05);
            for (let j = 0; j < pattern[i].length; j++) {
                let number = pattern[i][j];
                let x = startPos.x + xOffset;
                let y = startY + j * (2 * ballRadius * 1.05);
                this.AllBalls.push(new Ball(new Vector2D(x, y), number));
            }
        }
        this.AllBalls.push(this.whiteBall);
    }

    gameLoop() {
        if (PoolGame.getInstance().state === GameState.PLAY) this.update();
        this.draw();
        if (PoolGame.getInstance().state === GameState.PAUSE) {
            let ctx = PoolGame.getInstance().myCanvas.context;
            ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
            ctx.fillRect(0, 0, PoolGame.getInstance().myCanvas.canvas.width, PoolGame.getInstance().myCanvas.canvas.height);
        }
        requestAnimationFrame(() => this.gameLoop());
    }

    initEventListeners() {
        document.addEventListener("keydown", (e) => this.handleKeyInput(e));
        document.addEventListener("mousedown", (e) => this.handleMouseInput(e));
        document.addEventListener("mouseup", (e) => this.handleMouseInput(e));
        document.addEventListener("mousemove", (e) => this.handleMouseInput(e));
    }
}