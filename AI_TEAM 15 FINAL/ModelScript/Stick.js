class Stick {
    constructor(whiteBall) {
        this.img = PoolGame.getInstance().assets.images['stick'];
        this.angle = 0;
        this.power = 0;
        this.whiteBall = whiteBall;
        this.aimLine = null;
        this.aimAssist = new URLSearchParams(window.location.search).get("aim") || "basic";
    }

    draw() {
        this.origin = new Vector2D(this.img.width + this.whiteBall.origin.x + this.power, this.img.height / 2);
        PoolGame.getInstance().myCanvas.DrawImage(this.img, this.whiteBall.position, this.angle, this.origin);

        this.aimLine = this.calculateAimLine(this.angle);

        let canvas = PoolGame.getInstance().myCanvas;
        let ctx = canvas.context;
        let scale = canvas.getScale();
        let offset = canvas.getOffset();
        let R = this.whiteBall.radius * scale;

        let startPos = this.whiteBall.position.multiply(scale).add(offset);
        let endPos = this.aimLine.endpos.multiply(scale).add(offset);

        ctx.save();

        ctx.beginPath();
        ctx.moveTo(startPos.x, startPos.y);
        ctx.lineTo(endPos.x, endPos.y);
        ctx.lineWidth = 2 * scale;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(endPos.x, endPos.y, R, 0, Math.PI * 2);
        ctx.lineWidth = 2 * scale;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(endPos.x, endPos.y, R, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
        ctx.fill();

        if (this.aimAssist !== "off") {
            if (this.aimLine.thisVanToc.magnitude() > 0) {
                let whiteDir = this.aimLine.thisVanToc.normalize().multiply(80 * scale);
                ctx.beginPath();
                ctx.moveTo(endPos.x, endPos.y);
                ctx.lineTo(endPos.x + whiteDir.x, endPos.y + whiteDir.y);
                ctx.lineWidth = 2 * scale;
                ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
                ctx.stroke();
            }

            if (this.aimLine.hitBall) {
                let tStartPos = this.aimLine.thatpos.multiply(scale).add(offset);
                let targetEnd = this.aimAssist === "full" ? this.aimLine.targetEndPosFull : this.aimLine.targetEndPosBasic;
                let tEndPos = targetEnd.multiply(scale).add(offset);
                
                ctx.beginPath();
                ctx.moveTo(tStartPos.x, tStartPos.y);
                ctx.lineTo(tEndPos.x, tEndPos.y);
                ctx.lineWidth = 2 * scale;
                ctx.setLineDash([5 * scale, 5 * scale]);
                ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
                ctx.stroke();
                ctx.setLineDash([]);

                if (this.aimAssist === "full") {
                    ctx.beginPath();
                    ctx.arc(tEndPos.x, tEndPos.y, R, 0, Math.PI * 2);
                    ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
                    ctx.stroke();
                }

                if (this.isWrongTarget(this.aimLine.hitBall)) {
                    let targetPos = this.aimLine.thatpos.multiply(scale).add(offset);
                    let size = 12 * scale;
                    ctx.beginPath();
                    ctx.moveTo(targetPos.x - size, targetPos.y - size);
                    ctx.lineTo(targetPos.x + size, targetPos.y + size);
                    ctx.moveTo(targetPos.x + size, targetPos.y - size);
                    ctx.lineTo(targetPos.x - size, targetPos.y + size);
                    ctx.lineWidth = 4 * scale;
                    ctx.strokeStyle = "#ff0000";
                    ctx.stroke();
                }
            }
        }
        ctx.restore();
    }

    isWrongTarget(ball) {
        try {
            let gw = PoolGame.getInstance().gameWorld;
            let policy = gw.gamePolicy;
            if (!policy) return false;
            if (policy.gameType === '9ball') {
                let target = policy.getLowestBall();
                return target && ball.number !== target.number;
            }
            let myType = (policy.turn === 1) ? policy.player1_type : policy.player2_type;
            if (myType === null) return ball.number === 8;
            if (ball.number === 8) return policy.getRemainingBalls(myType) > 0;
            return ball.type !== myType;
        } catch (e) {
            return false;
        }
    }

    resetPower() {
        this.power = 0;
        this.aimLine = this.calculateAimLine(this.angle);
    }
    
    setPower(power) {
        this.power = Math.max(0, Math.min(200, power));
    }
    
    setAngle(angle) {
        this.angle = angle;
        this.aimLine = this.calculateAimLine(this.angle);
    }

    upAngle() {
        this.angle += 1;
        this.aimLine = this.calculateAimLine(this.angle);
    }

    downAngle() {
        this.angle -= 1;
        this.aimLine = this.calculateAimLine(this.angle);
    }

    upPower() {
        this.power = Math.min(200, this.power + 6);
    }

    downPower() {
        this.power = Math.max(0, this.power - 6);
    }
    
    shoot() {
        let policy = PoolGame.getInstance().gameWorld.gamePolicy;
        let dx = this.power / 50.0 * Math.cos(this.angle * Math.PI / 180);
        let dy = this.power / 50.0 * Math.sin(this.angle * Math.PI / 180);
        this.whiteBall.vantoc = new Vector2D(dx, dy);
        this.whiteBall.spin = PoolGame.getInstance().gameWorld.spin.copy();
        policy.lockInput = true;
        this.power = 0;
        PoolGame.getInstance().assets.playSound('strike');
    }

    calculateAimLine(angle) {
        let rad = angle * Math.PI / 180;
        let dir = new Vector2D(Math.cos(rad), Math.sin(rad));
        let startPos = this.whiteBall.position;
        let R = this.whiteBall.radius;
        let minT = Infinity;
        let hitBall = null;
        let isWall = false;

        let board = PoolGame.getInstance().gameWorld.board;
        let minX = board.leftWall + R;
        let maxX = board.width - board.rightWall - R;
        let minY = board.topWall + R;
        let maxY = board.height - board.bottomWall - R;

        if (dir.x > 0) { let t = (maxX - startPos.x) / dir.x; if (t > 0 && t < minT) { minT = t; isWall = true; } }
        else if (dir.x < 0) { let t = (minX - startPos.x) / dir.x; if (t > 0 && t < minT) { minT = t; isWall = true; } }
        if (dir.y > 0) { let t = (maxY - startPos.y) / dir.y; if (t > 0 && t < minT) { minT = t; isWall = true; } }
        else if (dir.y < 0) { let t = (minY - startPos.y) / dir.y; if (t > 0 && t < minT) { minT = t; isWall = true; } }

        for (let ball of PoolGame.getInstance().gameWorld.AllBalls) {
            if (ball.isInHole || ball === this.whiteBall) continue;
            let v = ball.position.subtract(startPos);
            let proj = v.dot(dir);
            if (proj > 0) {
                let closest = startPos.add(dir.multiply(proj));
                let distSq = ball.position.subtract(closest).magnitude() ** 2;
                if (distSq <= (R * 2) ** 2) {
                    let tCol = proj - Math.sqrt((R * 2) ** 2 - distSq);
                    if (tCol > 0 && tCol < minT) { minT = tCol; hitBall = ball; isWall = false; }
                }
            }
        }

        let endPos = startPos.add(dir.multiply(minT));
        let thisVanToc = new Vector2D(0, 0);
        let thatpos = endPos;
        let targetEndPosBasic = null;
        let targetEndPosFull = null;

        if (hitBall) {
            let normal = hitBall.position.subtract(endPos).normalize();
            let speed = dir.dot(normal);
            thisVanToc = dir.subtract(normal.multiply(speed * 1.98 / 2));
            thatpos = hitBall.position;

            let tDir = normal;
            targetEndPosBasic = hitBall.position.add(tDir.multiply(80));

            let tMinT = Infinity;
            if (tDir.x > 0) { let t = (maxX - hitBall.position.x) / tDir.x; if (t > 0 && t < tMinT) tMinT = t; }
            else if (tDir.x < 0) { let t = (minX - hitBall.position.x) / tDir.x; if (t > 0 && t < tMinT) tMinT = t; }
            if (tDir.y > 0) { let t = (maxY - hitBall.position.y) / tDir.y; if (t > 0 && t < tMinT) tMinT = t; }
            else if (tDir.y < 0) { let t = (minY - hitBall.position.y) / tDir.y; if (t > 0 && t < tMinT) tMinT = t; }

            for (let b of PoolGame.getInstance().gameWorld.AllBalls) {
                if (b.isInHole || b === hitBall) continue;
                let bPos = (b === this.whiteBall) ? endPos : b.position;
                let v = bPos.subtract(hitBall.position);
                let proj = v.dot(tDir);
                if (proj > 0) {
                    let closest = hitBall.position.add(tDir.multiply(proj));
                    let distSq = bPos.subtract(closest).magnitude() ** 2;
                    if (distSq <= (R * 2) ** 2) {
                        let tCol = proj - Math.sqrt((R * 2) ** 2 - distSq);
                        if (tCol > 0 && tCol < tMinT) tMinT = tCol;
                    }
                }
            }
            targetEndPosFull = hitBall.position.add(tDir.multiply(tMinT));
        } else if (isWall) {
            thisVanToc = dir.copy();
            if (endPos.x <= minX + 0.1 || endPos.x >= maxX - 0.1) thisVanToc.x *= -1;
            if (endPos.y <= minY + 0.1 || endPos.y >= maxY - 0.1) thisVanToc.y *= -1;
        }

        return { endpos: endPos, thisVanToc, thatpos, hitBall, targetEndPosBasic, targetEndPosFull, angle };
    }
}