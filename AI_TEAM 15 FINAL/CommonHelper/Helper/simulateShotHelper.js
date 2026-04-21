function simulateShot(angle, power, whiteBall, balls, holes) {
    let whiteBallInHole = false;
    let solidsPotted = 0;
    let stripesPotted = 0;
    let eightPotted = false;
    let ninePotted = false;
    let anyPottedCount = 0;
    let firstHit = null;

    let simulatedWhiteBall = new Ball(whiteBall.position.copy(), 0);
    simulatedWhiteBall.vantoc = new Vector2D(
        Math.cos((angle * Math.PI) / 180) * (power / 50),
        Math.sin((angle * Math.PI) / 180) * (power / 50)
    );

    let simulatedBalls = balls.map(ball => {
        let clone = new Ball(ball.position.copy(), ball.number);
        return clone;
    });
    simulatedBalls.push(simulatedWhiteBall);

    let maxSteps = 500;
    let deltaTime = 16;
    let haveBallInHole = [];

    for (let step = 0; step < maxSteps; step++) {
        let allBallsStopped = true;

        for (let i = 0; i < simulatedBalls.length; i++) {
            if (simulatedBalls[i].isInHole) continue;
            simulatedBalls[i].update(deltaTime);

            for (let j = i + 1; j < simulatedBalls.length; j++) {
                if (simulatedBalls[j].isInHole) continue;
                let collided = simulatedBalls[i].CollideBall(simulatedBalls[j]);
                
                if (collided && firstHit === null) {
                    if (simulatedBalls[i] === simulatedWhiteBall) firstHit = simulatedBalls[j].number;
                    if (simulatedBalls[j] === simulatedWhiteBall) firstHit = simulatedBalls[i].number;
                }
            }

            simulatedBalls[i].CollideWall();
            simulatedBalls[i].CollideHole();

            if (simulatedBalls[i].isMoving()) {
                allBallsStopped = false;
            }
        }

        for (let ball of simulatedBalls) {
            if (ball.isInHole && !haveBallInHole.includes(ball.id)) {
                haveBallInHole.push(ball.id);
                if (ball.type === BallType.WHITE) {
                    whiteBallInHole = true;
                } else {
                    anyPottedCount++;
                    if (ball.number === 8) eightPotted = true;
                    if (ball.number === 9) ninePotted = true;
                    if (ball.type === BallType.SOLID) solidsPotted++;
                    if (ball.type === BallType.STRIPE) stripesPotted++;
                }
            }
        }

        if (allBallsStopped) break;
    }

    let minDistance = Infinity;
    let targetBalls = [];
    let gameType = PoolGame.getInstance().gameWorld.gameType;

    if (gameType === '9ball') {
        let lowest = null;
        for (let b of simulatedBalls) {
            if (b.type !== BallType.WHITE && !b.isInHole) {
                if (!lowest || b.number < lowest.number) lowest = b;
            }
        }
        if (lowest) targetBalls.push(lowest);
    } else {
        let targetType = PoolGame.getInstance().gameWorld.gamePolicy.player2_type;
        targetBalls = simulatedBalls.filter(b => b.type === targetType && !b.isInHole);
        if(targetType === null) targetBalls = simulatedBalls.filter(b => (b.type === BallType.SOLID || b.type === BallType.STRIPE) && !b.isInHole);
        if(targetBalls.length === 0) targetBalls = simulatedBalls.filter(b => b.number === 8 && !b.isInHole);
    }

    for (let hole of holes) {
        for(let tb of targetBalls){
            let distance = tb.position.distanceFrom(hole);
            if (distance < minDistance) minDistance = distance;
        }
    }

    return {
        whiteBallInHole,
        solidsPotted,
        stripesPotted,
        eightPotted,
        ninePotted,
        anyPottedCount,
        firstHit,
        distanceToHole: minDistance
    };
}