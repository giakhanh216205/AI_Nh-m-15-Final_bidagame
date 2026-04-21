document.getElementById("homeBtn").addEventListener("click", function () {
    window.location.href = "../Menu/menu.html"; 
});

const pauseIcon = document.getElementById("pause-icon");
const pauseOverlay = document.getElementById("pause-overlay");
const btnResume = document.getElementById("btn-resume");
const btnPlayAgainMenu = document.getElementById("btn-playagain");
const btnRestartWin = document.getElementById("btnRestartWin");

if (pauseIcon) {
    pauseIcon.addEventListener("click", () => {
        PoolGame.getInstance().pause();
        pauseOverlay.style.display = "block";
    });
}

if (btnResume) {
    btnResume.addEventListener("click", () => {
        PoolGame.getInstance().resume();
        pauseOverlay.style.display = "none";
    });
}

if (btnPlayAgainMenu) {
    btnPlayAgainMenu.addEventListener("click", () => {
        location.reload();
    });
}

if (btnRestartWin) {
    btnRestartWin.addEventListener("click", () => {
        location.reload();
    });
}

const spinBall = document.getElementById("spin-ball");
const spinDot = document.getElementById("spin-dot");
let isDraggingSpin = false;

if (spinBall) {
    spinBall.addEventListener("mousedown", (e) => {
        isDraggingSpin = true;
        updateSpin(e);
    });
    window.addEventListener("mousemove", (e) => {
        if (isDraggingSpin) updateSpin(e);
    });
    window.addEventListener("mouseup", () => {
        isDraggingSpin = false;
    });
}

function updateSpin(e) {
    const rect = spinBall.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const radius = rect.width / 2;

    let dx = e.clientX - centerX;
    let dy = e.clientY - centerY;
    let dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > radius - 7) {
        dx = (dx / dist) * (radius - 7);
        dy = (dy / dist) * (radius - 7);
    }

    spinDot.style.left = `calc(50% + ${dx}px)`;
    spinDot.style.top = `calc(50% + ${dy}px)`;

    let spinX = dx / (radius - 7);
    let spinY = dy / (radius - 7);

    let poolGame = typeof PoolGame !== 'undefined' ? PoolGame.getInstance() : null;
    if (poolGame && poolGame.gameWorld) {
        poolGame.gameWorld.spin = new Vector2D(spinX, spinY);
    }
}