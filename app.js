(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const stage = document.getElementById('stage');

  const scoreVal = document.getElementById('scoreVal');
  const livesVal = document.getElementById('livesVal');
  const levelVal = document.getElementById('levelVal');
  const comboVal = document.getElementById('comboVal');

  const startScreen = document.getElementById('startScreen');
  const pauseScreen = document.getElementById('pauseScreen');
  const gameOverScreen = document.getElementById('gameOverScreen');
  const levelUpScreen = document.getElementById('levelUpScreen');
  const gameOverTitle = document.getElementById('gameOverTitle');
  const gameOverText = document.getElementById('gameOverText');

  const startBtn = document.getElementById('startBtn');
  const restartBtn = document.getElementById('restartBtn');
  const resumeBtn = document.getElementById('resumeBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const muteBtn = document.getElementById('muteBtn');
  const crtBtn = document.getElementById('crtBtn');

  // ---------------- audio (synth, no external files) ----------------
  let actx = null;
  let muted = false;
  function ensureAudio(){ if(!actx){ actx = new (window.AudioContext||window.webkitAudioContext)(); } }
  function beep(freq, dur=0.08, type='square', vol=0.05, delay=0){
    if(muted) return;
    ensureAudio();
    const t0 = actx.currentTime + delay;
    const osc = actx.createOscillator();
    const gain = actx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(actx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }
  const sfx = {
    paddle: () => beep(220, 0.07, 'square', 0.06),
    wall:   () => beep(160, 0.05, 'triangle', 0.04),
    brick:  (row) => beep(340 + row*40, 0.09, 'square', 0.055),
    power:  () => { beep(500,0.07,'square',0.06); beep(700,0.07,'square',0.06,0.08); beep(900,0.09,'square',0.06,0.16); },
    life:   () => { beep(300,0.15,'sawtooth',0.05); beep(180,0.2,'sawtooth',0.05,0.12); },
    over:   () => { beep(220,0.2,'sawtooth',0.06); beep(160,0.25,'sawtooth',0.06,0.18); beep(100,0.4,'sawtooth',0.06,0.36); },
    levelup:() => { beep(440,0.08,'square',0.06); beep(660,0.08,'square',0.06,0.09); beep(880,0.14,'square',0.06,0.18); }
  };

  muteBtn.addEventListener('click', () => {
    muted = !muted;
    muteBtn.textContent = muted ? '🔇 MUTED' : '🔊 SOUND';
    muteBtn.classList.toggle('on', muted);
  });
  crtBtn.addEventListener('click', () => {
    stage.classList.toggle('crt');
    crtBtn.classList.toggle('on');
  });

  // ---------------- sizing ----------------
  let W = 0, H = 0, DPR = Math.min(window.devicePixelRatio || 1, 2);
  function resize(){
    const rect = stage.getBoundingClientRect();
    W = rect.width; H = rect.height;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    ctx.setTransform(DPR,0,0,DPR,0,0);
    layoutBricks();
  }
  window.addEventListener('resize', resize);

  // ---------------- game state ----------------
  const COLORS = ['#0ff0fc', '#9d4dff', '#ff2e88', '#ffd60a', '#39ff88'];
  const state = {
    running:false, paused:false, over:true,
    score:0, lives:3, level:1, combo:1, comboTimer:0,
    highScore:0,
  };

  const paddle = { w:110, h:16, x:0, y:0, baseW:110, widenTimer:0, speedKey:{left:false,right:false} };
  let balls = [];
  let bricks = [];
  let particles = [];
  let powerups = [];
  let ballLaunched = false;
  let slowTimer = 0;

  function resetPaddle(){
    paddle.w = paddle.baseW;
    paddle.h = 16;
    paddle.x = W/2 - paddle.w/2;
    paddle.y = H - 34;
  }

  function newBall(x, y, dx, dy){
    return { x, y, r:8, dx, dy };
  }

  function layoutBricks(rowsOverride){
    // recompute existing brick grid positions responsively; called on resize too
    const cols = bricks.cols || 8;
    const rows = bricks.rows || 5;
    const pad = 8;
    const top = 46;
    const bw = (W - pad*(cols+1)) / cols;
    const bh = 26;
    const grid = [];
    for(let r=0;r<rows;r++){
      for(let c=0;c<cols;c++){
        const existing = bricks.map && bricks[r] && bricks[r][c];
        grid.push({
          x: pad + c*(bw+pad),
          y: top + r*(bh+pad),
          w: bw, h: bh,
          alive: existing ? existing.alive : true,
          color: COLORS[r % COLORS.length],
          hp: existing ? existing.hp : (r < 1 ? 2 : 1),
        });
      }
    }
    grid.cols = cols; grid.rows = rows;
    bricks = grid;
  }

  function buildLevel(level){
    const cols = Math.min(6 + Math.floor(level/2), 10);
    const rows = Math.min(3 + Math.floor((level-1)/1), 7);
    bricks = []; bricks.cols = cols; bricks.rows = rows;
    layoutBricks();
    for(const b of bricks){
      b.alive = true;
      b.hp = (Math.random() < Math.min(0.1 + level*0.03, 0.4)) ? 2 : 1;
    }
  }

  function startRun(){
    ensureAudio();
    state.running = true; state.paused = false; state.over = false;
    state.score = 0; state.lives = 3; state.level = 1; state.combo = 1; state.comboTimer = 0;
    resetPaddle();
    buildLevel(state.level);
    balls = [ newBall(W/2, paddle.y - 14, 3, -4) ];
    ballLaunched = false;
    particles = []; powerups = [];
    slowTimer = 0; paddle.widenTimer = 0;
    updateHud();
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    pauseScreen.classList.add('hidden');
  }

  function updateHud(){
    scoreVal.textContent = state.score;
    livesVal.textContent = state.lives;
    levelVal.textContent = state.level;
    comboVal.textContent = 'x' + state.combo;
  }

  function spawnParticles(x, y, color, n=10){
    for(let i=0;i<n;i++){
      const ang = Math.random()*Math.PI*2;
      const spd = 1 + Math.random()*3;
      particles.push({
        x, y, vx:Math.cos(ang)*spd, vy:Math.sin(ang)*spd,
        life:1, color, size: 2+Math.random()*2
      });
    }
  }

  function maybeDropPowerup(x,y){
    if(Math.random() < 0.16){
      const types = ['WIDEN','MULTI','SLOW','LIFE'];
      const type = types[Math.floor(Math.random()*types.length)];
      const colorMap = {WIDEN:'#0ff0fc', MULTI:'#9d4dff', SLOW:'#ff2e88', LIFE:'#39ff88'};
      powerups.push({ x, y, w:26, h:16, vy:2, type, color:colorMap[type] });
    }
  }

  function applyPowerup(type){
    sfx.power();
    if(type === 'WIDEN'){
      paddle.w = paddle.baseW * 1.6;
      paddle.widenTimer = 620; // frames
    } else if(type === 'SLOW'){
      slowTimer = 480;
    } else if(type === 'LIFE'){
      state.lives++;
    } else if(type === 'MULTI'){
      const extra = [];
      for(const b of balls){
        extra.push(newBall(b.x, b.y, -b.dy*0.6 - 1, b.dy));
        extra.push(newBall(b.x, b.y, b.dy*0.6 + 1, b.dy));
      }
      balls = balls.concat(extra).slice(0, 6);
    }
    updateHud();
  }

  // ---------------- input ----------------
  document.addEventListener('keydown', (e) => {
    if(e.code === 'ArrowLeft' || e.code === 'KeyA') paddle.speedKey.left = true;
    if(e.code === 'ArrowRight' || e.code === 'KeyD') paddle.speedKey.right = true;
    if(e.code === 'Space'){ e.preventDefault(); launch(); }
    if(e.code === 'KeyP' || e.code === 'Escape') togglePause();
  });
  document.addEventListener('keyup', (e) => {
    if(e.code === 'ArrowLeft' || e.code === 'KeyA') paddle.speedKey.left = false;
    if(e.code === 'ArrowRight' || e.code === 'KeyD') paddle.speedKey.right = false;
  });

  function pointerX(clientX){
    const rect = stage.getBoundingClientRect();
    return clientX - rect.left;
  }
  stage.addEventListener('mousemove', (e) => {
    if(!state.running || state.paused) return;
    const px = pointerX(e.clientX) - paddle.w/2;
    paddle.x = Math.max(0, Math.min(W - paddle.w, px));
  });
  stage.addEventListener('touchmove', (e) => {
    if(!state.running || state.paused) return;
    const t = e.touches[0];
    const px = pointerX(t.clientX) - paddle.w/2;
    paddle.x = Math.max(0, Math.min(W - paddle.w, px));
    e.preventDefault();
  }, {passive:false});
  stage.addEventListener('mousedown', launch);
  stage.addEventListener('touchstart', launch, {passive:true});

  function launch(){
    if(!state.running || state.paused || state.over) return;
    if(!ballLaunched){
      ballLaunched = true;
    }
  }

  function togglePause(){
    if(!state.running || state.over) return;
    state.paused = !state.paused;
    pauseScreen.classList.toggle('hidden', !state.paused);
    if(!state.paused) loop();
  }
  pauseBtn.addEventListener('click', togglePause);
  resumeBtn.addEventListener('click', togglePause);
  startBtn.addEventListener('click', startRun);
  restartBtn.addEventListener('click', startRun);

  // ---------------- physics helpers ----------------
  function rectCircleCollide(rx,ry,rw,rh, cx,cy,cr){
    const nx = Math.max(rx, Math.min(cx, rx+rw));
    const ny = Math.max(ry, Math.min(cy, ry+rh));
    const dx = cx - nx, dy = cy - ny;
    return (dx*dx + dy*dy) < cr*cr;
  }

  function endLife(){
    sfx.life();
    state.lives--;
    state.combo = 1; state.comboTimer = 0;
    updateHud();
    if(state.lives < 0){
      gameOver(false);
      return;
    }
    resetPaddle();
    balls = [ newBall(W/2, paddle.y - 14, 3, -4) ];
    ballLaunched = false;
  }

  function gameOver(win){
    state.running = false; state.over = true;
    if(state.score > state.highScore) state.highScore = state.score;
    sfx.over();
    gameOverTitle.textContent = win ? 'YOU WIN!' : 'GAME OVER';
    gameOverText.textContent = `Score: ${state.score}  ·  Level reached: ${state.level}  ·  High score this session: ${state.highScore}`;
    gameOverScreen.classList.remove('hidden');
  }

  function nextLevel(){
    sfx.levelup();
    state.level++;
    document.getElementById('levelUpNum').textContent = state.level;
    levelUpScreen.classList.remove('hidden');
    setTimeout(() => levelUpScreen.classList.add('hidden'), 1100);
    buildLevel(state.level);
    resetPaddle();
    balls = [ newBall(W/2, paddle.y - 14, 3 + state.level*0.2, -(4 + state.level*0.2)) ];
    ballLaunched = false;
    updateHud();
  }

  // ---------------- main loop ----------------
  function update(){
    if(!state.running || state.paused) return;

    const slowFactor = slowTimer > 0 ? 0.55 : 1;
    if(slowTimer > 0) slowTimer--;
    if(paddle.widenTimer > 0){
      paddle.widenTimer--;
      if(paddle.widenTimer === 0) paddle.w = paddle.baseW;
    }
    if(state.comboTimer > 0){
      state.comboTimer--;
      if(state.comboTimer === 0){ state.combo = 1; updateHud(); }
    }

    // paddle movement
    const pSpeed = 6.5;
    if(paddle.speedKey.left) paddle.x -= pSpeed;
    if(paddle.speedKey.right) paddle.x += pSpeed;
    paddle.x = Math.max(0, Math.min(W - paddle.w, paddle.x));

    // balls
    for(const ball of balls){
      if(!ballLaunched){
        ball.x = paddle.x + paddle.w/2;
        ball.y = paddle.y - ball.r - 2;
        continue;
      }
      ball.x += ball.dx * slowFactor;
      ball.y += ball.dy * slowFactor;

      if(ball.x - ball.r < 0){ ball.x = ball.r; ball.dx *= -1; sfx.wall(); }
      if(ball.x + ball.r > W){ ball.x = W - ball.r; ball.dx *= -1; sfx.wall(); }
      if(ball.y - ball.r < 0){ ball.y = ball.r; ball.dy *= -1; sfx.wall(); }

      // paddle collision
      if(ball.dy > 0 && rectCircleCollide(paddle.x, paddle.y, paddle.w, paddle.h, ball.x, ball.y, ball.r)){
        const hitPos = (ball.x - paddle.x) / paddle.w; // 0..1
        const angle = (hitPos - 0.5) * (Math.PI/2.6);
        const speed = Math.hypot(ball.dx, ball.dy);
        ball.dx = Math.sin(angle) * speed;
        ball.dy = -Math.abs(Math.cos(angle) * speed);
        ball.y = paddle.y - ball.r - 1;
        sfx.paddle();
      }

      // brick collisions
      for(const b of bricks){
        if(!b.alive) continue;
        if(rectCircleCollide(b.x, b.y, b.w, b.h, ball.x, ball.y, ball.r)){
          b.hp--;
          const overlapX = Math.min(ball.x - b.x, b.x + b.w - ball.x);
          const overlapY = Math.min(ball.y - b.y, b.y + b.h - ball.y);
          if(overlapX < overlapY) ball.dx *= -1; else ball.dy *= -1;
          if(b.hp <= 0){
            b.alive = false;
            state.combo = Math.min(state.combo + 1, 9);
            state.comboTimer = 110;
            state.score += 10 * state.combo;
            spawnParticles(ball.x, ball.y, b.color);
            maybeDropPowerup(b.x + b.w/2, b.y + b.h/2);
            sfx.brick(Math.floor(b.y/40));
          } else {
            spawnParticles(ball.x, ball.y, b.color, 4);
          }
          updateHud();
          break;
        }
      }
    }

    // remove fallen balls
    if(ballLaunched){
      const before = balls.length;
      balls = balls.filter(b => b.y - b.r < H + 30);
      if(balls.length === 0){
        endLife();
      }
    }

    // powerups falling
    for(const p of powerups) p.y += p.vy;
    for(const p of powerups){
      if(p.caught) continue;
      if(rectCircleCollide(paddle.x, paddle.y, paddle.w, paddle.h, p.x, p.y, 10)){
        p.caught = true;
        applyPowerup(p.type);
      }
    }
    powerups = powerups.filter(p => !p.caught && p.y < H + 20);

    // particles
    for(const pt of particles){
      pt.x += pt.vx; pt.y += pt.vy; pt.vy += 0.06; pt.life -= 0.03;
    }
    particles = particles.filter(pt => pt.life > 0);

    // level clear
    if(state.running && bricks.every(b => !b.alive)){
      if(state.level >= 12){
        gameOver(true);
      } else {
        nextLevel();
      }
    }
  }

  function drawGlowRect(x,y,w,h,color, r=4){
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 14;
    ctx.fillStyle = color;
    roundRect(x,y,w,h,r);
    ctx.fill();
    ctx.restore();
  }
  function roundRect(x,y,w,h,r){
    ctx.beginPath();
    ctx.moveTo(x+r,y);
    ctx.arcTo(x+w,y,x+w,y+h,r);
    ctx.arcTo(x+w,y+h,x,y+h,r);
    ctx.arcTo(x,y+h,x,y,r);
    ctx.arcTo(x,y,x+w,y,r);
    ctx.closePath();
  }

  function draw(){
    ctx.clearRect(0,0,W,H);

    // bricks
    for(const b of bricks){
      if(!b.alive) continue;
      ctx.globalAlpha = b.hp > 1 ? 1 : 0.92;
      drawGlowRect(b.x, b.y, b.w, b.h, b.color, 6);
      if(b.hp > 1){
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,.7)';
        ctx.lineWidth = 1.5;
        roundRect(b.x+2, b.y+2, b.w-4, b.h-4, 4);
        ctx.stroke();
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }

    // powerups
    for(const p of powerups){
      drawGlowRect(p.x - p.w/2, p.y - p.h/2, p.w, p.h, p.color, 5);
      ctx.save();
      ctx.fillStyle = '#0a0417';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.type[0], p.x, p.y+1);
      ctx.restore();
    }

    // particles
    for(const pt of particles){
      ctx.save();
      ctx.globalAlpha = Math.max(pt.life, 0);
      ctx.fillStyle = pt.color;
      ctx.shadowColor = pt.color;
      ctx.shadowBlur = 8;
      ctx.fillRect(pt.x - pt.size/2, pt.y - pt.size/2, pt.size, pt.size);
      ctx.restore();
    }

    // paddle
    drawGlowRect(paddle.x, paddle.y, paddle.w, paddle.h, paddle.widenTimer > 0 ? '#0ff0fc' : '#ffffff', paddle.h/2);

    // balls
    for(const ball of balls){
      ctx.save();
      ctx.shadowColor = '#ffd60a';
      ctx.shadowBlur = 16;
      ctx.fillStyle = '#ffd60a';
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
    }
  }

  function loop(){
    update();
    draw();
    if(state.running && !state.paused){
      requestAnimationFrame(loop);
    }
  }

  // kick things off
  resize();
  resetPaddle();
  buildLevel(1);
  draw();

  // wrap loop start so pause/resume re-enters cleanly
  const origStart = startRun;
  window.__startLoop = () => requestAnimationFrame(loop);
  startBtn.addEventListener('click', () => requestAnimationFrame(loop));
  restartBtn.addEventListener('click', () => requestAnimationFrame(loop));
  resumeBtn.addEventListener('click', () => requestAnimationFrame(loop));
})();