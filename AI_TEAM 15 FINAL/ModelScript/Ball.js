const BallColor = Object.freeze({
    WHITE: Symbol("white"),
    RED: Symbol("red"),
    YELLOW: Symbol("yellow"),
});

const BallType = Object.freeze({
    WHITE: 0,
    SOLID: 1,
    STRIPE: 2,
    EIGHT: 3
});

const BallColors = [
    "#e8e8e8", "#fbc02d", "#1976d2", "#d32f2f", "#7b1fa2", "#f57c00", "#388e3c", "#5d4037", "#212121",
    "#fbc02d", "#1976d2", "#d32f2f", "#7b1fa2", "#f57c00", "#388e3c", "#5d4037"
];

class Ball {
    constructor(position, number = 0) {
        this.id = this.generateId();
        this.position = position;
        this.number = number;
        
        if (number === 0) {
            this.type = BallType.WHITE;
            this.color = BallColor.WHITE; 
        }
        else if (number === 8) {
            this.type = BallType.EIGHT;
        }
        else if (number < 8) {
            this.type = BallType.SOLID;
        }
        else {
            this.type = BallType.STRIPE;
        }

        this.isInHole = false;
        this.vantoc = new Vector2D(0, 0);
        this.firstCollide = null;
        this.radius = 20;
        this.origin = new Vector2D(this.radius, this.radius); 
        this.rotation = Math.random() * Math.PI * 2;
        this.lastSoundTime = 0;
        this.spin = new Vector2D(0, 0);
        this.check = false;
    }

    update(deltaTime) {
        if (this.isMoving()) {
            this.position = this.position.add(this.vantoc.multiply(deltaTime));
            this.updateMoving(deltaTime);
        }
    }

    draw() {
        if (this.isInHole) return;

        let canvas = PoolGame.getInstance().myCanvas;
        let pos = this.position.multiply(canvas.getScale()).add(canvas.getOffset());
        let r = this.radius * canvas.getScale();
        let ctx = canvas.context;

        ctx.save();
        ctx.translate(pos.x, pos.y);

        let shadowGrad = ctx.createRadialGradient(3, 4, r * 0.3, 3, 4, r * 1.2);
        shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0.6)');
        shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.beginPath();
        ctx.arc(3, 4, r * 1.2, 0, Math.PI * 2);
        ctx.fillStyle = shadowGrad;
        ctx.fill();

        ctx.save();
        ctx.rotate(this.rotation);

        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fillStyle = "#e8e8e8";
        ctx.fill();

        if (this.number !== 0) {
            if (this.type === BallType.STRIPE) {
                ctx.beginPath();
                ctx.arc(0, 0, r, 0, Math.PI * 2);
                ctx.clip();

                ctx.fillStyle = BallColors[this.number];
                ctx.fillRect(-r, -r * 0.55, r * 2, r * 1.1);
                
                ctx.beginPath();
                ctx.arc(0, 0, r, 0, Math.PI * 2);
                ctx.lineWidth = 1;
                ctx.strokeStyle = "#cccccc";
                ctx.stroke();
            } else {
                ctx.beginPath();
                ctx.arc(0, 0, r, 0, Math.PI * 2);
                ctx.fillStyle = BallColors[this.number];
                ctx.fill();
            }

            ctx.beginPath();
            ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2);
            ctx.fillStyle = "#e8e8e8";
            ctx.fill();

            ctx.fillStyle = "#000000";
            ctx.font = `bold ${r * 0.6}px Arial`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(this.number.toString(), 0, 0);
        } else {
            ctx.beginPath();
            ctx.arc(r * 0.4, 0, r * 0.15, 0, Math.PI * 2);
            ctx.fillStyle = "#cc0000";
            ctx.fill();

            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.lineWidth = 1;
            ctx.strokeStyle = "#cccccc";
            ctx.stroke();
        }

        ctx.restore();

        let grad = ctx.createRadialGradient(-r*0.3, -r*0.3, r*0.05, 0, 0, r);
        if (this.number === 0) {
            grad.addColorStop(0, 'rgba(255,255,255,0.15)');
            grad.addColorStop(0.5, 'rgba(0,0,0,0.02)');
            grad.addColorStop(1, 'rgba(0,0,0,0.25)');
        } else {
            grad.addColorStop(0, 'rgba(255,255,255,0.4)');
            grad.addColorStop(0.5, 'rgba(0,0,0,0.05)');
            grad.addColorStop(1, 'rgba(0,0,0,0.45)');
        }
        
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.restore();
    }

    updateMoving(deltaTime) {
        const timeScale = deltaTime / (1000 / 60);
        const friction = Math.pow(0.985, timeScale);
        this.vantoc = this.vantoc.multiply(friction);
        
        let speed = this.vantoc.magnitude();
        if (speed > 0) {
            this.rotation += speed * deltaTime * 0.003;
        }

        if (this.spin && this.spin.magnitude() > 0.01) {
            this.spin = this.spin.multiply(Math.pow(0.99, timeScale));
            if (speed > 0.5) {
                let moveDir = this.vantoc.normalize();
                let perpendicular = new Vector2D(-moveDir.y, moveDir.x);
                this.vantoc = this.vantoc.add(perpendicular.multiply(this.spin.x * 0.02 * timeScale));
            }
        } else {
            this.spin = new Vector2D(0, 0);
        }

        if (speed < 0.02) {
            this.vantoc = new Vector2D(0, 0);
        }
    }

    applyWallSpin(collisionNormal, impactSpeed) {
        if (this.type !== BallType.WHITE || !this.spin || this.spin.magnitude() === 0) return;
        let tangent = new Vector2D(-collisionNormal.y, collisionNormal.x);
        let spinForce = tangent.multiply(-this.spin.x * impactSpeed * 0.3);
        this.vantoc = this.vantoc.add(spinForce);
        this.spin.x *= 0.6;
        this.spin.y *= 0.8;
    }

    CollideBall(that) {
        let distance = this.position.subtract(that.position).magnitude();
        let ballRadius = this.radius;

        if (distance <= ballRadius * 2) {
            if (this.firstCollide == null) {
                this.firstCollide = that;
            }
            if (that.firstCollide == null) {
                that.firstCollide = this;
            }

            let overlap = (ballRadius * 2) - distance;
            let normal = this.position.subtract(that.position).normalize();
            
            this.position = this.position.add(normal.multiply(overlap / 2));
            that.position = that.position.subtract(normal.multiply(overlap / 2));

            let relativeVelocity = this.vantoc.subtract(that.vantoc);
            let speed = relativeVelocity.dot(normal);

            if (speed > 0) return true;

            let now = Date.now();
            if (Math.abs(speed) > 1 && (now - this.lastSoundTime > 30)) {
                let isRealBall = PoolGame.getInstance().gameWorld.AllBalls.includes(this);
                if (isRealBall) {
                    let volume = Math.min(1, (Math.abs(speed) / 15) + 0.3);
                    PoolGame.getInstance().assets.playSound('ballCollide', volume);
                }
                this.lastSoundTime = now;
                that.lastSoundTime = now;
            }

            let restitution = 0.98;
            let impulse = speed * (1 + restitution);

            let newVantoc1 = this.vantoc.subtract(normal.multiply(impulse / 2));
            let newVantoc2 = that.vantoc.add(normal.multiply(impulse / 2));

            this.vantoc = newVantoc1;
            that.vantoc = newVantoc2;

            if (this.type === BallType.WHITE && this.spin && this.spin.magnitude() > 0) {
                let spinEffect = normal.multiply(this.spin.y * speed * 0.4);
                this.vantoc = this.vantoc.add(spinEffect);
                this.spin.y *= 0.5;
            }
            if (that.type === BallType.WHITE && that.spin && that.spin.magnitude() > 0) {
                let spinEffect = normal.multiply(-that.spin.y * speed * 0.4);
                that.vantoc = that.vantoc.add(spinEffect);
                that.spin.y *= 0.5;
            }
            
            return true;
        }
        return false;
    }

    CollideWall() {
        let board = PoolGame.getInstance().gameWorld.board;
        let collided = false;
        let radius = this.radius;

        for (let hole of board.HolePosition) {
            if (this.position.subtract(hole).magnitude() <= board.HoleRadius) {
                return false; 
            }
        }

        let center = new Vector2D(board.width / 2, board.height / 2);

        for (let line of board.lines) {
            let ab = line.p2.subtract(line.p1);
            let ap = this.position.subtract(line.p1);
            let t = ap.dot(ab) / ab.dot(ab);
            t = Math.max(0, Math.min(1, t));
            let closest = line.p1.add(ab.multiply(t));

            let distVec = this.position.subtract(closest);
            let distance = distVec.magnitude();

            if (distance <= radius) {
                if (distVec.magnitude() === 0) continue;
                
                let lineNormal = new Vector2D(-ab.y, ab.x).normalize();
                let toCenter = center.subtract(closest);
                if (lineNormal.dot(toCenter) < 0) {
                    lineNormal = lineNormal.multiply(-1);
                }

                let collisionNormal;
                if (t > 0 && t < 1) {
                    collisionNormal = lineNormal;
                } else {
                    collisionNormal = distVec.normalize();
                    if (collisionNormal.dot(lineNormal) < 0) {
                        collisionNormal = lineNormal;
                    }
                }

                this.position = closest.add(collisionNormal.multiply(radius));
                
                let speed = this.vantoc.dot(collisionNormal);
                if (speed < 0) {
                    let impactSpeed = Math.abs(speed);
                    this.vantoc = this.vantoc.subtract(collisionNormal.multiply(2 * speed)).multiply(0.9);
                    this.applyWallSpin(collisionNormal, impactSpeed);
                    collided = true;
                }
            }
        }

        let inHoleArea = false;
        for (let hole of board.HolePosition) {
            if (this.position.subtract(hole).magnitude() <= board.HoleRadius + 30) {
                inHoleArea = true;
                break;
            }
        }

        if (!inHoleArea) {
            if (this.position.x - radius < board.leftWall) {
                this.position.x = board.leftWall + radius;
                if (this.vantoc.x < 0) {
                    let impactSpeed = Math.abs(this.vantoc.x);
                    this.vantoc.x *= -0.9;
                    this.applyWallSpin(new Vector2D(1, 0), impactSpeed);
                    collided = true;
                }
            } else if (this.position.x + radius > board.width - board.rightWall) {
                this.position.x = board.width - board.rightWall - radius;
                if (this.vantoc.x > 0) {
                    let impactSpeed = Math.abs(this.vantoc.x);
                    this.vantoc.x *= -0.9;
                    this.applyWallSpin(new Vector2D(-1, 0), impactSpeed);
                    collided = true;
                }
            }

            if (this.position.y - radius < board.topWall) {
                this.position.y = board.topWall + radius;
                if (this.vantoc.y < 0) {
                    let impactSpeed = Math.abs(this.vantoc.y);
                    this.vantoc.y *= -0.9;
                    this.applyWallSpin(new Vector2D(0, 1), impactSpeed);
                    collided = true;
                }
            } else if (this.position.y + radius > board.height - board.bottomWall) {
                this.position.y = board.height - board.bottomWall - radius;
                if (this.vantoc.y > 0) {
                    let impactSpeed = Math.abs(this.vantoc.y);
                    this.vantoc.y *= -0.9;
                    this.applyWallSpin(new Vector2D(0, -1), impactSpeed);
                    collided = true;
                }
            }
        }

        if (this.position.x < radius) { 
            this.position.x = radius; 
            this.vantoc.x *= -1; 
        }
        if (this.position.x > board.width - radius) { 
            this.position.x = board.width - radius; 
            this.vantoc.x *= -1; 
        }
        if (this.position.y < radius) { 
            this.position.y = radius; 
            this.vantoc.y *= -1; 
        }
        if (this.position.y > board.height - radius) { 
            this.position.y = board.height - radius; 
            this.vantoc.y *= -1; 
        }

        if (collided && this.vantoc.magnitude() > 1.5) {
            let isRealBall = PoolGame.getInstance().gameWorld.AllBalls.includes(this);
            if (isRealBall) {
                let volume = Math.min(1, (this.vantoc.magnitude() / 15) + 0.3);
                PoolGame.getInstance().assets.playSound('side', volume);
            }
        }

        return collided;
    }

    CollideHole() {
        let board = PoolGame.getInstance().gameWorld.board;

        for (let i = 0; i < board.HolePosition.length; i++) {
            let hole = board.HolePosition[i];
            let distance = this.position.subtract(hole).magnitude();

            if (distance <= board.HoleRadius) {
                let pullDir = hole.subtract(this.position).normalize();
                this.vantoc = this.vantoc.add(pullDir.multiply(0.5)); 

                if (distance <= 25) { 
                    if (!this.isInHole) {
                        let gw = PoolGame.getInstance().gameWorld;
                        let isRealBall = gw.AllBalls.includes(this);
                        if (isRealBall) {
                            PoolGame.getInstance().assets.playSound('hole', 1.0);
                            if (!gw.gamePolicy.firstPottedThisTurn) {
                                gw.gamePolicy.firstPottedThisTurn = this;
                            }
                            gw.gamePolicy.pottedHoleIndex = i;
                        }
                    }
                    this.isInHole = true;
                    this.vantoc = new Vector2D(0, 0);
                    return true;
                }
            }
        }
        return false;
    }

    generateId() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0,
                v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    isMoving() {
        return !this.isInHole && this.vantoc.magnitude() > 0.02;
    }

    resetFirstCollide() {
        this.firstCollide = null;
    }
}