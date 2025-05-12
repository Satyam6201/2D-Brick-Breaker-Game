const container = document.querySelector('.container');
let conDim = container.getBoundingClientRect();

// Game Overlay UI
const overlay = document.createElement('div');
overlay.className = "game-overlay";
overlay.innerHTML = `
    <button id="startBtn">Start Game</button>
    <button id="restartBtn" style="display:none;">Restart Game</button>
    <button id="themeToggle">🌙 Dark Mode</button>
    <div id="gameMessage"></div>
`;
document.body.prepend(overlay);

// Score and Lives
const scoreEl = document.querySelector('.score');
const livesEl = document.querySelector('.lives');

// Ball Element
const ball = document.createElement('div');
ball.className = 'ball';
ball.style.display = "none";
container.appendChild(ball);

// Paddle Element
const paddle = document.createElement('div');
paddle.className = 'paddle';
container.appendChild(paddle);

// Game State
const player = {
    gameover: true,
    lives: 3,
    score: 0,
    ballDir: [2, -5],
    inPlay: false,
    left: false,
    right: false
};

document.addEventListener('keydown', function (e) {
    if (e.key === "ArrowLeft") player.left = true;
    if (e.key === "ArrowRight") player.right = true;
    if (e.key === "ArrowUp" && !player.inPlay) player.inPlay = true;
});

document.addEventListener('keyup', function (e) {
    if (e.key === "ArrowLeft") player.left = false;
    if (e.key === "ArrowRight") player.right = false;
});

// Buttons
document.getElementById('startBtn').addEventListener('click', () => {
    if (player.gameover) startGame();
});
document.getElementById('restartBtn').addEventListener('click', () => {
    endGame();
    setTimeout(startGame, 300);
});
document.getElementById('themeToggle').addEventListener('click', toggleTheme);

// Start Game
function startGame() {
    player.score = 0;
    player.lives = 3;
    player.inPlay = false;
    player.gameover = false;

    ball.style.display = "block";
    ball.style.left = paddle.offsetLeft + 40 + "px";
    ball.style.top = paddle.offsetTop - 25 + "px";

    setupBricks(80);
    scoreUpdater();

    document.getElementById('startBtn').style.display = "none";
    document.getElementById('restartBtn').style.display = "inline-block";
    document.getElementById('gameMessage').innerHTML = "";

    player.ani = requestAnimationFrame(update);
}

// Score & Lives Updater
function scoreUpdater() {
    scoreEl.textContent = player.score;
    livesEl.textContent = player.lives;
}

// Create Bricks
function setupBricks(num) {
    let row = { x: ((conDim.width % 100) / 2), y: 50 };
    let skip = false;
    for (let x = 0; x < num; x++) {
        if (row.x > (conDim.width - 100)) {
            row.y += 50;
            if (row.y > (conDim.height / 2)) skip = true;
            row.x = ((conDim.width % 100) / 2);
        }
        if (!skip) createBrick(row, x + 1);
        row.x += 100;
    }
}

function createBrick(pos, num) {
    const div = document.createElement('div');
    div.className = 'brick';
    div.style.backgroundColor = rColor();
    div.textContent = num;
    div.style.left = pos.x + 'px';
    div.style.top = pos.y + 'px';
    container.appendChild(div);
}

// Utility - Collision
function isCollide(a, b) {
    let aRect = a.getBoundingClientRect();
    let bRect = b.getBoundingClientRect();
    return !(aRect.right < bRect.left || aRect.left > bRect.right || aRect.bottom < bRect.top || aRect.top > bRect.bottom);
}

function rColor() {
    return '#' + Math.floor(Math.random() * 16777215).toString(16);
}

// Game Loop
function update() {
    if (player.gameover) return;
    let pCurrent = paddle.offsetLeft;
    if (player.left && pCurrent > 0) pCurrent -= 7;
    if (player.right && (pCurrent < (conDim.width - paddle.offsetWidth))) pCurrent += 7;
    paddle.style.left = pCurrent + 'px';

    if (!player.inPlay) {
        ball.style.top = (paddle.offsetTop - 25) + 'px';
        ball.style.left = (paddle.offsetLeft + 40) + 'px';
    } else {
        moveBall();
    }

    player.ani = requestAnimationFrame(update);
}

// Ball Movement
function moveBall() {
    let posBall = { x: ball.offsetLeft, y: ball.offsetTop };

    // Wall bounce
    if (posBall.y <= 0) player.ballDir[1] *= -1;
    if (posBall.x <= 0 || posBall.x >= (conDim.width - 20)) player.ballDir[0] *= -1;

    // Fall off
    if (posBall.y > (conDim.height - 20)) {
        player.lives--;
        scoreUpdater();
        if (player.lives < 0) return endGame();
        stopper();
        return;
    }

    // Paddle hit
    if (isCollide(paddle, ball)) {
        let diff = ((posBall.x - paddle.offsetLeft) - (paddle.offsetWidth / 2)) / 8;
        player.ballDir[0] = diff;
        player.ballDir[1] *= -1;
    }

    // Brick hit
    let bricks = document.querySelectorAll('.brick');
    for (let brick of bricks) {
        if (isCollide(brick, ball)) {
            brick.remove();
            player.ballDir[1] *= -1;
            player.score++;
            scoreUpdater();
        }
    }

    // Win condition
    if (bricks.length === 0 && !player.gameover) {
        stopper();
        setupBricks(80);
    }

    posBall.y += player.ballDir[1];
    posBall.x += player.ballDir[0];
    ball.style.top = posBall.y + 'px';
    ball.style.left = posBall.x + 'px';
}

function stopper() {
    player.inPlay = false;
    cancelAnimationFrame(player.ani);
}

function endGame() {
    player.gameover = true;
    cancelAnimationFrame(player.ani);
    ball.style.display = "none";

    const message = `Game Over<br>Score: ${player.score}`;
    document.getElementById('gameMessage').innerHTML = message;

    document.querySelectorAll('.brick').forEach(b => b.remove());
}

// Theme Toggle
function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const themeBtn = document.getElementById('themeToggle');
    if (document.body.classList.contains('dark-mode')) {
        themeBtn.textContent = '☀️ Light Mode';
    } else {
        themeBtn.textContent = '🌙 Dark Mode';
    }
}
