const container = document.querySelector('.container');
let conDim = container.getBoundingClientRect();

const scoreEl = document.querySelector('.score');
const livesEl = document.querySelector('.lives');
const levelEl = document.querySelector('.level');
const gameMessage = document.getElementById('gameMessage');
const restartBtn = document.getElementById('restartBtn');
const toggleBtn = document.getElementById('toggleMode');

const ball = document.createElement('div');
ball.className = 'ball';
ball.style.display = "none";
container.appendChild(ball);

const paddle = document.createElement('div');
paddle.className = 'paddle';
container.appendChild(paddle);

let bricks = [];

const player = {
  gameover: true,
  lives: 3,
  score: 0,
  ballDir: [2, -4],
  inPlay: false,
  left: false,
  right: false
};

// Controls
document.addEventListener('keydown', e => {
  if (e.key === "ArrowLeft") player.left = true;
  if (e.key === "ArrowRight") player.right = true;
  if (e.key === "ArrowUp" && !player.inPlay && !player.gameover) player.inPlay = true;
});
document.addEventListener('keyup', e => {
  if (e.key === "ArrowLeft") player.left = false;
  if (e.key === "ArrowRight") player.right = false;
});

// Start game
window.onload = () => {
  restartBtn.addEventListener('click', () => {
    endGame();
    setTimeout(startGame, 300);
  });
  toggleBtn.addEventListener('click', toggleTheme);
  startGame();
};

function startGame() {
  player.score = 0;
  player.lives = 3;
  player.inPlay = false;
  player.gameover = false;
  scoreUpdater();
  ball.style.display = "block";
  ball.style.left = paddle.offsetLeft + 50 + "px";
  ball.style.top = paddle.offsetTop - 25 + "px";
  setupBricks(60);
  gameMessage.textContent = "Press ↑ to launch the ball!";
  player.ani = requestAnimationFrame(update);
}

function endGame() {
  player.gameover = true;
  player.inPlay = false;
  cancelAnimationFrame(player.ani);
  container.querySelectorAll('.brick').forEach(b => b.remove());
  ball.style.display = "none";
}

function update() {
  if (player.gameover) return;

  let pCurrent = paddle.offsetLeft;
  if (player.left && pCurrent > 0) pCurrent -= 7;
  if (player.right && pCurrent < conDim.width - paddle.offsetWidth) pCurrent += 7;
  paddle.style.left = pCurrent + "px";

  if (!player.inPlay) {
    ball.style.top = paddle.offsetTop - 25 + "px";
    ball.style.left = paddle.offsetLeft + 50 + "px";
  } else {
    moveBall();
  }

  player.ani = requestAnimationFrame(update);
}

function moveBall() {
  let ballX = ball.offsetLeft;
  let ballY = ball.offsetTop;

  if (ballX <= 0 || ballX >= conDim.width - ball.offsetWidth) {
    player.ballDir[0] *= -1;
  }

  if (ballY <= 0) {
    player.ballDir[1] *= -1;
  }

  if (ballY > conDim.height - ball.offsetHeight) {
    player.lives--;
    scoreUpdater();
    player.inPlay = false;
    if (player.lives <= 0) {
      gameMessage.textContent = "💀 Game Over!";
      endGame();
      return;
    }
  }

  if (isCollide(ball, paddle)) {
    player.ballDir[1] *= -1;
  }

  const allBricks = document.querySelectorAll('.brick');
  allBricks.forEach(brick => {
    if (isCollide(ball, brick)) {
      player.ballDir[1] *= -1;
      brick.remove();
      player.score += 10;
      scoreUpdater();
    }
  });

  if (allBricks.length === 0) {
    gameMessage.textContent = "🏆 You Won!";
    endGame();
    return;
  }

  ballX += player.ballDir[0];
  ballY += player.ballDir[1];

  ball.style.left = ballX + "px";
  ball.style.top = ballY + "px";
}

function scoreUpdater() {
  scoreEl.textContent = `Score: ${player.score}`;
  livesEl.textContent = `Lives: ${player.lives}`;
}

function isCollide(a, b) {
  let aRect = a.getBoundingClientRect();
  let bRect = b.getBoundingClientRect();
  return !(
    aRect.top > bRect.bottom ||
    aRect.bottom < bRect.top ||
    aRect.right < bRect.left ||
    aRect.left > bRect.right
  );
}

function setupBricks(num) {
  bricks = [];
  let x = 10, y = 50;
  for (let i = 0; i < num; i++) {
    const brick = document.createElement('div');
    brick.className = 'brick';
    brick.style.left = x + 'px';
    brick.style.top = y + 'px';
    brick.style.backgroundColor = rColor();
    brick.textContent = i + 1;
    container.appendChild(brick);
    x += 100;
    if (x > conDim.width - 90) {
      x = 10;
      y += 40;
    }
  }
}

function rColor() {
  return '#' + Math.floor(Math.random() * 16777215).toString(16);
}

function toggleTheme() {
  document.body.classList.toggle('dark-mode');
  toggleBtn.textContent = document.body.classList.contains('dark-mode') ? '☀️ Light Mode' : '🌙 Dark Mode';
}
