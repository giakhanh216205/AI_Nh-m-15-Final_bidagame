class GamePolicy {
    constructor(gameWorld) {
        this.gameWorld = gameWorld;
        this.turn = 1;
        this.lockInput = false;
        this.isBreak = true;
        this.goHole = false;
        this.isFoul = false;

        const params = new URLSearchParams(window.location.search);
        this.gameType = params.get("type") || "8ball";
        this.callMode = params.get("call") || "none";

        this.selectedHoleIndex = null;
        this.pottedHoleIndex = null;

        this.player1_type = null;
        this.player2_type = null;
        this.firstPottedThisTurn = null;
        this.currentTurnStartBalls = 0;
        this.currentTurnStartTargetNumber = null;

        this.player1 = document.getElementById("player1");
        this.player2 = document.getElementById("player2");
        this.timerElem = document.getElementById("turn-timer");

        this.namePlayerWinner1 = document.getElementById("namePlayerWinner");
        this.displayWinner = document.getElementById("displayWinner");

        this.namePlayer2 = document.getElementById("player2_name");
        if (!this.gameWorld.isBotOn) {
            this.namePlayer2.innerHTML = "Player 2";
        }
        
        this.waitForNextTurn = false;
        this.gameOver = false;
        
        this.timeLimit = 30;
        this.timeLeft = this.timeLimit;
        this.lastTime = Date.now();
        
        this.updatePlayerActiveUI();
        this.updateScoresUI();
    }

    update() {
        if (PoolGame.getInstance().state !== GameState.PLAY) {
            this.lastTime = Date.now();
            return;
        }

        if (this.waitForNextTurn || this.gameOver) {
            this.lastTime = Date.now();
            return;
        }

        let now = Date.now();
        let dt = (now - this.lastTime) / 1000;
        this.lastTime = now;

        if (this.lockInput) {
            let isNextTurn = true;
            for (let ball of this.gameWorld.AllBalls) {
                if (ball.isMoving()) isNextTurn = false;
            }

            if (isNextTurn) {
                this.waitForNextTurn = true;
                setTimeout(() => {
                    this.processTurnEnd();
                    this.waitForNextTurn = false;
                }, 500);
            }
        } else {
            if (this.turn === 1 || (this.turn === 2 && !this.gameWorld.isBotOn)) {
                this.timeLeft -= dt;
                if (this.timeLeft <= 0) {
                    this.timeLeft = 0;
                    this.isFoul = true;
                    this.waitForNextTurn = true;
                    this.processTurnEnd();
                    this.waitForNextTurn = false;
                }
                this.updateTimerUI();
            } else {
                this.timerElem.innerHTML = "∞";
                this.timerElem.classList.remove("timer-warning");
            }
        }

        this.updateScoresUI();
    }

    updateTimerUI() {
        let seconds = Math.ceil(this.timeLeft);
        if (seconds < 0) seconds = 0;
        this.timerElem.innerHTML = seconds;
        if (seconds <= 5 && seconds > 0) {
            this.timerElem.classList.add("timer-warning");
        } else {
            this.timerElem.classList.remove("timer-warning");
        }
    }

    updatePlayerActiveUI() {
        if (this.turn === 1) {
            this.player1.classList.add("player-active");
            this.player2.classList.remove("player-active");
        } else {
            this.player2.classList.add("player-active");
            this.player1.classList.remove("player-active");
        }
    }

    getLowestBall() {
        let lowest = null;
        for (let b of this.gameWorld.AllBalls) {
            if (b.type !== BallType.WHITE && !b.isInHole) {
                if (!lowest || b.number < lowest.number) {
                    lowest = b;
                }
            }
        }
        return lowest;
    }

    updateScoresUI() {
        let p1List = document.getElementById("player1_balls_list");
        let p2List = document.getElementById("player2_balls_list");

        if (!p1List || !p2List) return;

        if (this.gameType === '9ball') {
            let target = this.getLowestBall();
            let html = target ? `<div class="ball-icon ball-${target.number} ${target.number > 8 ? 'ball-stripe' : ''}"></div>` : "";
            
            if (this.turn === 1) {
                p1List.innerHTML = `<span style="color:white; margin-right:5px; font-size:0.9em;">Target: </span>` + html;
                p2List.innerHTML = "";
            } else {
                p1List.innerHTML = "";
                p2List.innerHTML = `<span style="color:white; margin-right:5px; font-size:0.9em;">Target: </span>` + html;
            }
        } else {
            p1List.innerHTML = this.getBallListHtml(this.player1_type);
            p2List.innerHTML = this.getBallListHtml(this.player2_type);
        }
    }

    getBallListHtml(type) {
        if (type === null) {
            return ""; 
        }

        let remaining = this.getRemainingBallsList(type);
        let html = "";

        if (remaining.length === 0) {
            html = `<div class="ball-icon ball-eight"></div>`;
        } else {
            for (let ballNum of remaining) {
                let isStripe = ballNum > 8;
                html += `<div class="ball-icon ball-${ballNum} ${isStripe ? 'ball-stripe' : ''}"></div>`;
            }
        }
        return html;
    }

    getRemainingBallsList(type) {
        if (type === null) return [];
        let list = [];
        let start = type === BallType.SOLID ? 1 : 9;
        let end = type === BallType.SOLID ? 7 : 15;

        for (let i = start; i <= end; i++) {
            let ball = this.gameWorld.AllBalls.find(b => b.number === i);
            if (ball && !ball.isInHole) {
                list.push(i);
            }
        }
        return list;
    }

    getRemainingBalls(type) {
        return this.getRemainingBallsList(type).length;
    }

    // --- CẬP NHẬT: LUẬT GỌI LỖ WPA CHUẨN ---
    isCallPocketRequired() {
        if (this.gameType === '9ball') return false;
        if (this.isBreak) return false;
        
        let isBot = (this.turn === 2 && this.gameWorld.isBotOn);
        if (isBot) return false; 

        // Luật WPA: Bàn mở (chưa phân bi) vẫn phải gọi lỗ cho từng cú đánh nếu bật 'all'
        if (this.callMode === 'all') return true;
        if (this.callMode === '8ballOnly') {
            let currentType = this.turn === 1 ? this.player1_type : this.player2_type;
            if (currentType !== null && this.getRemainingBalls(currentType) === 0) {
                return true;
            }
        }
        return false;
    }

    processTurnEnd() {
        let foulFromRules = this.checkFoul();
        this.isFoul = foulFromRules;

        let pottedThisTurn = [];
        for (let ball of this.gameWorld.AllBalls) {
            if (ball.isInHole && !ball.check) {
                ball.check = true;
                pottedThisTurn.push(ball);
            }
        }

        // KIỂM TRA GỌI LỖ (WPA)
        let isPocketCallValid = true;
        if (this.isCallPocketRequired() && pottedThisTurn.length > 0) {
            if (this.pottedHoleIndex !== this.selectedHoleIndex) {
                isPocketCallValid = false;
            }
        }

        // PHÂN BI THEO LUẬT WPA (Sau khi bi gọi rơi vào đúng lỗ gọi hợp lệ)
        if (this.gameType === '8ball' && this.player1_type === null && !this.isBreak && !this.isFoul && isPocketCallValid && this.firstPottedThisTurn) {
            let pType = this.firstPottedThisTurn.type;
            if (pType === BallType.SOLID || pType === BallType.STRIPE) {
                this.player1_type = (this.turn === 1) ? pType : (pType === BallType.SOLID ? BallType.STRIPE : BallType.SOLID);
                this.player2_type = (this.player1_type === BallType.SOLID) ? BallType.STRIPE : BallType.SOLID;
            }
        }

        this.goHole = false;
        if (!this.isFoul && isPocketCallValid && pottedThisTurn.length > 0) {
            if (this.gameType === '9ball') {
                this.goHole = true;
            } else {
                let myType = this.turn === 1 ? this.player1_type : this.player2_type;
                if (myType === null || pottedThisTurn.some(b => b.type === myType)) this.goHole = true;
            }
        }

        let winStatus = this.checkWinLose();
        if (winStatus !== 0) {
            this.gameOver = true;
            PoolGame.getInstance().state = GameState.OVER;
            if (winStatus === 1) this.showWinner("Player 1");
            else this.showWinner(this.gameWorld.isBotOn ? "Computer" : "Player 2");
            return;
        }

        let nextTurnIsBallInHand = false;
        if (this.isFoul) {
            this.gameWorld.whiteBall.position = this.gameWorld.initWhiteBallPos.copy();
            this.gameWorld.whiteBall.isInHole = false;
            this.gameWorld.whiteBall.vantoc = new Vector2D(0, 0);
            nextTurnIsBallInHand = true;
        }

        // CHUYỂN LƯỢT NẾU: Không ăn bi, Phạm lỗi, Hoặc ăn bi nhưng sai lỗ gọi
        if (!this.goHole || this.isFoul) {
            this.turn = 3 - this.turn;
            this.updatePlayerActiveUI();
        }

        this.isBreak = false;
        this.firstPottedThisTurn = null; 
        this.pottedHoleIndex = null;
        this.selectedHoleIndex = null;
        this.isFoul = nextTurnIsBallInHand;
        this.timeLeft = this.timeLimit;
        this.updateTimerUI();
        
        this.gameWorld.stick.resetPower();
        this.gameWorld.whiteBall.resetFirstCollide();

        if (this.turn === 2 && this.gameWorld.isBotOn) {
            this.lockInput = false;
            requestAnimationFrame(() => this.gameWorld.botProcess());
        } else {
            this.lockInput = false;
        }
    }

    checkFoul() {
        if (this.gameWorld.whiteBall.isInHole) return true;
        if (this.gameWorld.whiteBall.firstCollide == null) return true;

        if (this.gameType === '9ball') {
            if (this.currentTurnStartTargetNumber && this.gameWorld.whiteBall.firstCollide.number !== this.currentTurnStartTargetNumber) return true;
            return false;
        }

        let hit = this.gameWorld.whiteBall.firstCollide;
        let currentType = this.turn === 1 ? this.player1_type : this.player2_type;

        if (!this.isBreak) {
            if (currentType !== null) {
                if (this.getRemainingBalls(currentType) > 0 && hit.type !== currentType) return true;
                if (this.getRemainingBalls(currentType) === 0 && hit.type !== BallType.EIGHT) return true;
            } else {
                if (hit.type === BallType.EIGHT) return true;
            }
        }

        return false;
    }

    checkWinLose() {
        if (this.gameType === '9ball') {
            let nineBall = this.gameWorld.AllBalls.find(b => b.number === 9);
            if (!nineBall || !nineBall.isInHole) return 0;
            if (this.isFoul) {
                nineBall.isInHole = false; nineBall.check = false;
                nineBall.position = new Vector2D(this.gameWorld.board.width * 0.75, this.gameWorld.board.height / 2);
                nineBall.vantoc = new Vector2D(0, 0);
                return 0; 
            } else return this.turn;
        }

        let eightBall = this.gameWorld.AllBalls.find(b => b.type === BallType.EIGHT);
        if (!eightBall || !eightBall.isInHole) return 0;

        let currentType = this.turn === 1 ? this.player1_type : this.player2_type;
        if (currentType !== null && this.getRemainingBalls(currentType) === 0 && !this.isFoul) {
            if (this.callMode !== "none" && this.pottedHoleIndex !== this.selectedHoleIndex) return 3 - this.turn;
            return this.turn;
        }
        return 3 - this.turn;
    }

    showWinner(winnerName) {
        this.namePlayerWinner1.innerHTML = winnerName;
        this.displayWinner.style.display = "block";
    }
}