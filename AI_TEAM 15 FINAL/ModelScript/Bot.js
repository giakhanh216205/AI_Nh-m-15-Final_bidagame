class Bot {
    constructor() {}

    takeShot(isEvaluating = false) {
        try {
            let gw = PoolGame.getInstance().gameWorld;
            let policy = gw.gamePolicy;
            let diff = new URLSearchParams(window.location.search).get("diff") || "normal";
            let whiteBall = gw.whiteBall;
            let targetBalls = [];

            if (policy.gameType === '9ball') {
                let lowest = null;
                try { lowest = policy.getLowestBall(); } catch(e) {}
                if (lowest) targetBalls.push(lowest);
            } else {
                let myType = policy.turn === 1 ? policy.player1_type : policy.player2_type;
                if (myType === null || myType === undefined) {
                    targetBalls = gw.AllBalls.filter(b => b.number !== 0 && b.number !== 8 && !b.isInHole);
                } else {
                    targetBalls = gw.AllBalls.filter(b => b.type === myType && !b.isInHole);
                    if (targetBalls.length === 0) {
                        targetBalls = gw.AllBalls.filter(b => b.number === 8 && !b.isInHole);
                    }
                }
            }

            if (!targetBalls || targetBalls.length === 0) {
                return { angle: Math.random() * 360, power: 100, holeIndex: 0, quality: Infinity };
            }

            let bestShot = null;
            let holes = gw.board.HolePosition;
            let maxCut = diff === 'hard' ? 88 : 75; 

            for (let ball of targetBalls) {
                for (let i = 0; i < holes.length; i++) {
                    let hole = holes[i];
                    let ballToHole = hole.subtract(ball.position);
                    let distToHole = ballToHole.magnitude();
                    if (distToHole === 0) continue;
                    let dirToHole = ballToHole.normalize();
                    
                    let ghostPos = ball.position.subtract(dirToHole.multiply(ball.radius * 2));
                    
                    let whiteToGhost = ghostPos.subtract(whiteBall.position);
                    let distToGhost = whiteToGhost.magnitude();
                    if (distToGhost === 0) continue;
                    let dirToGhost = whiteToGhost.normalize();

                    if (this.isPathClear(ball.position, hole, ball) && this.isPathClear(whiteBall.position, ghostPos, whiteBall, ball)) {
                        let dotVal = dirToHole.dot(dirToGhost);
                        dotVal = Math.max(-1, Math.min(1, dotVal)); 
                        let cutAngle = Math.abs(Math.acos(dotVal) * 180 / Math.PI);
                        
                        if (cutAngle <= maxCut) { 
                            let scratchRisk = 0;
                            if (diff === 'hard') {
                                let tangentDir = dirToGhost.subtract(dirToHole.multiply(dotVal)).normalize();
                                for (let p of holes) {
                                    let toP = p.subtract(ghostPos);
                                    if (toP.magnitude() > 10 && tangentDir.dot(toP.normalize()) > 0.97) {
                                        scratchRisk = 5000; 
                                    }
                                }
                            }

                            let shotQuality = (cutAngle * 2) + (distToHole / 3) + (distToGhost / 3) + scratchRisk;
                            
                            if (!bestShot || shotQuality < bestShot.quality) {
                                let calculatedPower = 40 + (distToHole + distToGhost) / 4;
                                if (diff === 'hard') calculatedPower += cutAngle / 2; 

                                bestShot = {
                                    angle: Math.atan2(dirToGhost.y, dirToGhost.x) * 180 / Math.PI,
                                    power: Math.min(200, Math.max(50, calculatedPower)),
                                    holeIndex: i,
                                    quality: shotQuality
                                };
                            }
                        }
                    }
                }
            }

            if (!bestShot) {
                let bankShot = this.calculateBankShot(targetBalls);
                if (bankShot) bestShot = bankShot;
            }

            if (!bestShot) {
                let target = targetBalls.reduce((closest, b) => {
                    let d1 = b.position.distanceFrom(whiteBall.position);
                    let d2 = closest.position.distanceFrom(whiteBall.position);
                    return d1 < d2 ? b : closest;
                }, targetBalls[0]);

                let dir = target.position.subtract(whiteBall.position);
                if (dir.magnitude() === 0) dir = new Vector2D(1, 0);
                dir = dir.normalize();
                
                bestShot = {
                    angle: Math.atan2(dir.y, dir.x) * 180 / Math.PI,
                    power: diff === 'hard' ? 25 : 80, 
                    holeIndex: 0,
                    quality: 9999
                };
            }

            if (!isEvaluating) {
                let errorMargin = 0;
                if (diff === 'easy') {
                    errorMargin = (Math.random() - 0.5) * 8; 
                    bestShot.power = Math.min(200, Math.random() * 80 + 50); 
                } else if (diff === 'normal') {
                    errorMargin = (Math.random() - 0.5) * 2; 
                } else if (diff === 'hard') {
                    errorMargin = 0; 
                }
                bestShot.angle += errorMargin;
            }

            return bestShot;
        } catch (error) {
            return { angle: 0, power: 80, holeIndex: 0, quality: 9999 };
        }
    }

    calculateBankShot(targetBalls) {
        let gw = PoolGame.getInstance().gameWorld;
        let whitePos = gw.whiteBall.position;
        let R = gw.whiteBall.radius;
        let board = gw.board;
        
        let walls = [
            { normal: new Vector2D(0, 1), y: board.topWall + R }, 
            { normal: new Vector2D(0, -1), y: board.height - board.bottomWall - R }, 
            { normal: new Vector2D(1, 0), x: board.leftWall + R }, 
            { normal: new Vector2D(-1, 0), x: board.width - board.rightWall - R } 
        ];

        let bestBank = null;

        for (let ball of targetBalls) {
            for (let wall of walls) {
                let mirrorPos = ball.position.copy();
                if (wall.x !== undefined) {
                    mirrorPos.x = wall.x - (ball.position.x - wall.x);
                } else if (wall.y !== undefined) {
                    mirrorPos.y = wall.y - (ball.position.y - wall.y);
                }

                let dirToMirror = mirrorPos.subtract(whitePos);
                if (dirToMirror.magnitude() === 0) continue;
                dirToMirror = dirToMirror.normalize();
                
                let t = -1;
                if (wall.x !== undefined && dirToMirror.x !== 0) t = (wall.x - whitePos.x) / dirToMirror.x;
                if (wall.y !== undefined && dirToMirror.y !== 0) t = (wall.y - whitePos.y) / dirToMirror.y;
                
                if (t > 0) {
                    let bouncePoint = whitePos.add(dirToMirror.multiply(t));
                    
                    if (bouncePoint.x >= board.leftWall && bouncePoint.x <= board.width - board.rightWall &&
                        bouncePoint.y >= board.topWall && bouncePoint.y <= board.height - board.bottomWall) {
                        
                        if (this.isPathClear(whitePos, bouncePoint, gw.whiteBall) &&
                            this.isPathClear(bouncePoint, ball.position, gw.whiteBall, ball)) {
                            
                            let dist = t + bouncePoint.distanceFrom(ball.position);
                            let quality = 5000 + dist; 
                            
                            if (!bestBank || quality < bestBank.quality) {
                                bestBank = {
                                    angle: Math.atan2(dirToMirror.y, dirToMirror.x) * 180 / Math.PI,
                                    power: Math.min(200, 80 + dist / 3),
                                    holeIndex: 0,
                                    quality: quality
                                };
                            }
                        }
                    }
                }
            }
        }
        return bestBank;
    }

    calculatePlacement() {
        try {
            let gw = PoolGame.getInstance().gameWorld;
            let policy = gw.gamePolicy;
            let diff = new URLSearchParams(window.location.search).get("diff") || "normal";
            let board = gw.board;
            let R = gw.whiteBall.radius;

            let minX = board.leftWall + R;
            let maxX = board.width - board.rightWall - R;
            if (policy.isBreak) maxX = 85 + (board.width - 170) * 0.25;
            let minY = board.topWall + R;
            let maxY = board.height - board.bottomWall - R;

            let bestPos = new Vector2D(85 + (board.width - 170) * 0.25, board.height / 2);
            if (!gw.isValidPlacement(bestPos)) {
                for (let i = 0; i < 100; i++) {
                    let p = new Vector2D(minX + Math.random() * (maxX - minX), minY + Math.random() * (maxY - minY));
                    if (gw.isValidPlacement(p)) { bestPos = p; break; }
                }
            }

            if (diff === 'easy') {
                for (let i = 0; i < 50; i++) {
                    let pos = new Vector2D(minX + Math.random() * (maxX - minX), minY + Math.random() * (maxY - minY));
                    if (gw.isValidPlacement(pos)) return pos;
                }
                return bestPos;
            }

            let bestQuality = Infinity;
            let iterations = diff === 'hard' ? 80 : 20;
            let originalPos = gw.whiteBall.position.copy();

            for (let i = 0; i < iterations; i++) {
                let pos = new Vector2D(minX + Math.random() * (maxX - minX), minY + Math.random() * (maxY - minY));
                if (gw.isValidPlacement(pos)) {
                    gw.whiteBall.position = pos;
                    let shot = this.takeShot(true);
                    if (shot && shot.quality < bestQuality) {
                        bestQuality = shot.quality;
                        bestPos = pos;
                    }
                }
            }
            
            gw.whiteBall.position = originalPos;
            return bestPos;
        } catch (error) {
            return new Vector2D(400, 250);
        }
    }

    isPathClear(start, end, ignoreBall1, ignoreBall2 = null) {
        let dist = end.distanceFrom(start);
        if (dist === 0 || isNaN(dist)) return true;
        let dir = end.subtract(start).normalize();
        let gw = PoolGame.getInstance().gameWorld;
        let R = gw.whiteBall.radius;
        
        for (let b of gw.AllBalls) {
            if (b.isInHole || b === ignoreBall1 || b === ignoreBall2) continue;
            let v = b.position.subtract(start);
            let proj = v.dot(dir);
            if (proj > 0 && proj < dist) {
                let closest = start.add(dir.multiply(proj));
                if (closest.distanceFrom(b.position) < R * 2.01) { 
                    return false;
                }
            }
        }
        return true;
    }
}