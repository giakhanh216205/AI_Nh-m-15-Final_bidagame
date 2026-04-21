let music = document.getElementById("background-music");
let soundIcon = document.getElementById("sound-icon");
let currentMode = 'pvp';

function openSetup(mode) {
    currentMode = mode;
    document.getElementById("setup-title").innerText = mode === 'pvp' ? "THIẾT LẬP PVP" : "THIẾT LẬP PVE";
    document.getElementById("bot-setting").style.display = mode === 'bot' ? "grid" : "none";
    document.getElementById("setup-modal").style.display = "flex";
    checkGameType();
}

function checkGameType() {
    const type = document.getElementById("gameTypeSelect").value;
    const ruleRow = document.getElementById("rule-setting");
    if (type === '9ball') {
        ruleRow.style.opacity = "0.3";
        document.getElementById("callModeSelect").disabled = true;
    } else {
        ruleRow.style.opacity = "1";
        document.getElementById("callModeSelect").disabled = false;
    }
}

function closeSetup() {
    document.getElementById("setup-modal").style.display = "none";
}

function confirmStart() {
    const type = document.getElementById("gameTypeSelect").value;
    const aim = document.getElementById("aimSelect").value;
    const call = document.getElementById("callModeSelect").value;
    const diff = document.getElementById("diffSelect").value;
    
    document.getElementById("control-container").style.display = "flex";
    
    setTimeout(() => {
        window.location.href = `../Game/game.html?mode=${currentMode}&type=${type}&aim=${aim}&call=${call}&diff=${diff}`;
    }, 2500);
}

function showRules() {
    document.getElementById("rules-modal").style.display = "flex";
}

function hideRules() {
    document.getElementById("rules-modal").style.display = "none";
}

function toggleSound() {
    if (music.paused) {
        music.play();
        soundIcon.src = "../../Assets/Image/mute_button_hover.png";
    } else {
        music.pause();
        soundIcon.src = "../../Assets/Image/mute_button_pressed_hover.png";
    }
}