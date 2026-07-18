(() => {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  const W = canvas.width;
  const H = canvas.height;

  const scoreEl = document.getElementById("score");
  const bestEl = document.getElementById("best");
  const livesEl = document.getElementById("lives");
  const overlay = document.getElementById("overlay");
  const overlayBody = document.getElementById("overlay-body");
  const startBtn = document.getElementById("start-btn");

  const BEST_KEY = "oceanCruiser.best";
  const START_LIVES = 3;

  const STATE = { START: "start", PLAYING: "playing", PAUSED: "paused", GAMEOVER: "gameover" };
  let state = STATE.START;

  let best = Number(localStorage.getItem(BEST_KEY) || 0);
  bestEl.textContent = best;

  // ---- Player ship ----
  const ship = {
    x: W / 2,
    y: H - 120,
    w: 46,
    h: 64,
    speed: 320, // px/sec for keyboard control
    invuln: 0,
  };

  const bounds = { minX: 34, maxX: W - 34, minY: H * 0.35, maxY: H - 50 };

  // ---- Input ----
  const keys = Object.create(null);
  window.addEventListener("keydown", (e) => {
    keys[e.key.toLowerCase()] = true;
    if (e.key.toLowerCase() === "p") togglePause();
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(e.key.toLowerCase())) {
      e.preventDefault();
    }
  });
  window.addEventListener("keyup", (e) => {
    keys[e.key.toLowerCase()] = false;
  });

  let pointerActive = false;
  let pointerTarget = null;

  function canvasPoint(evt) {
    const rect = canvas.getBoundingClientRect();
    const cx = (evt.touches ? evt.touches[0].clientX : evt.clientX) - rect.left;
    const cy = (evt.touches ? evt.touches[0].clientY : evt.clientY) - rect.top;
    return { x: (cx / rect.width) * W, y: (cy / rect.height) * H };
  }

  function pointerDown(evt) {
    if (state !== STATE.PLAYING) return;
    pointerActive = true;
    pointerTarget = canvasPoint(evt);
  }
  function pointerMove(evt) {
    if (!pointerActive) return;
    pointerTarget = canvasPoint(evt);
  }
  function pointerUp() {
    pointerActive = false;
    pointerTarget = null;
  }

  canvas.addEventListener("mousedown", pointerDown);
  canvas.addEventListener("mousemove", pointerMove);
  window.addEventListener("mouseup", pointerUp);
  canvas.addEventListener(
    "touchstart",
    (e) => {
      pointerDown(e);
      e.preventDefault();
    },
    { passive: false }
  );
  canvas.addEventListener(
    "touchmove",
    (e) => {
      pointerMove(e);
      e.preventDefault();
    },
    { passive: false }
  );
  canvas.addEventListener("touchend", pointerUp);

  startBtn.addEventListener("click", () => {
    if (state === STATE.GAMEOVER || state === STATE.START) startGame();
  });

  // ---- Entities ----
  let entities = [];
  let particles = [];
  let waveOffset = 0;
  let spawnTimer = 0;
  let elapsed = 0;
  let score = 0;
  let lives = START_LIVES;
  let scrollSpeed = 140; // px/sec baseline

  const OBSTACLE_TYPES = [
    { emoji: "🧊", r: 26, points: 0, kind: "obstacle" },
    { emoji: "🪨", r: 24, points: 0, kind: "obstacle" },
    { emoji: "🌀", r: 28, points: 0, kind: "obstacle" },
  ];
  const COLLECTIBLE_TYPES = [
    { emoji: "🛟", r: 20, points: 10, kind: "collectible" },
    { emoji: "💰", r: 20, points: 25, kind: "collectible" },
    { emoji: "🧑", r: 20, points: 15, kind: "collectible" },
  ];
  const RARE_COLLECTIBLE_TYPES = [
    { emoji: "🍺", r: 20, points: 40, kind: "collectible" },
  ];
  const RARE_CHANCE = 0.18;

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }
  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function difficultyFactor() {
    // ramps up over ~90 seconds, then plateaus
    return Math.min(1 + elapsed / 45, 2.6);
  }

  function spawnEntity() {
    const isObstacle = Math.random() < 0.62;
    const def = isObstacle
      ? pick(OBSTACLE_TYPES)
      : Math.random() < RARE_CHANCE
      ? pick(RARE_COLLECTIBLE_TYPES)
      : pick(COLLECTIBLE_TYPES);
    entities.push({
      ...def,
      x: rand(bounds.minX, bounds.maxX),
      y: -40,
      vy: scrollSpeed * difficultyFactor() * rand(0.9, 1.15),
      spin: rand(-1, 1),
      angle: 0,
    });
  }

  function resetGame() {
    entities = [];
    particles = [];
    score = 0;
    lives = START_LIVES;
    elapsed = 0;
    spawnTimer = 0;
    ship.x = W / 2;
    ship.y = H - 120;
    ship.invuln = 1.2;
    updateHud();
  }

  function startGame() {
    resetGame();
    state = STATE.PLAYING;
    overlay.classList.add("hidden");
    lastTime = performance.now();
    requestAnimationFrame(loop);
  }

  function togglePause() {
    if (state === STATE.PLAYING) {
      state = STATE.PAUSED;
      overlayBody.innerHTML = `<p class="result">Paused</p>`;
      startBtn.textContent = "Resume";
      overlay.classList.remove("hidden");
    } else if (state === STATE.PAUSED) {
      state = STATE.PLAYING;
      overlay.classList.add("hidden");
      startBtn.textContent = "Set Sail";
      lastTime = performance.now();
      requestAnimationFrame(loop);
    }
  }

  function gameOver() {
    state = STATE.GAMEOVER;
    const isNewBest = score > best;
    if (isNewBest) {
      best = score;
      localStorage.setItem(BEST_KEY, String(best));
    }
    bestEl.textContent = best;
    overlayBody.innerHTML = `
      <p class="result">Your ship was lost at sea.<br/><strong>Score: ${Math.floor(score)}</strong></p>
      ${isNewBest ? '<p class="new-best">🏆 New best score!</p>' : ""}
    `;
    startBtn.textContent = "Sail Again";
    overlay.classList.remove("hidden");
  }

  function updateHud() {
    scoreEl.textContent = Math.floor(score);
    bestEl.textContent = best;
    livesEl.textContent = "⚓".repeat(Math.max(lives, 0)) + "·".repeat(Math.max(START_LIVES - lives, 0));
  }

  function spawnSplash(x, y, color) {
    for (let i = 0; i < 10; i++) {
      particles.push({
        x,
        y,
        vx: rand(-90, 90),
        vy: rand(-140, -20),
        life: rand(0.4, 0.8),
        age: 0,
        color,
      });
    }
  }

  // ---- Update ----
  let lastTime = 0;

  function update(dt) {
    elapsed += dt;
    score += dt * 6 * difficultyFactor();

    // movement
    let dx = 0;
    let dy = 0;
    if (keys["arrowleft"] || keys["a"]) dx -= 1;
    if (keys["arrowright"] || keys["d"]) dx += 1;
    if (keys["arrowup"] || keys["w"]) dy -= 1;
    if (keys["arrowdown"] || keys["s"]) dy += 1;

    if (dx !== 0 || dy !== 0) {
      const len = Math.hypot(dx, dy) || 1;
      ship.x += (dx / len) * ship.speed * dt;
      ship.y += (dy / len) * ship.speed * dt;
    } else if (pointerTarget) {
      const tdx = pointerTarget.x - ship.x;
      const tdy = pointerTarget.y - ship.y;
      const dist = Math.hypot(tdx, tdy);
      if (dist > 4) {
        const pull = Math.min(dist, ship.speed * 1.4 * dt);
        ship.x += (tdx / dist) * pull;
        ship.y += (tdy / dist) * pull;
      }
    }

    ship.x = Math.min(bounds.maxX, Math.max(bounds.minX, ship.x));
    ship.y = Math.min(bounds.maxY, Math.max(bounds.minY, ship.y));

    if (ship.invuln > 0) ship.invuln -= dt;

    // waves
    waveOffset += dt * (scrollSpeed * 0.5 * difficultyFactor());

    // spawn
    spawnTimer -= dt;
    const spawnInterval = Math.max(0.85 - elapsed * 0.01, 0.32);
    if (spawnTimer <= 0) {
      spawnEntity();
      spawnTimer = spawnInterval;
    }

    // entities
    for (const ent of entities) {
      ent.y += ent.vy * dt;
      ent.angle += ent.spin * dt;
    }
    entities = entities.filter((ent) => ent.y < H + 60);

    // collisions
    if (ship.invuln <= 0) {
      for (const ent of entities) {
        if (ent.dead) continue;
        const dist = Math.hypot(ent.x - ship.x, ent.y - (ship.y - 6));
        if (dist < ent.r + 20) {
          if (ent.kind === "obstacle") {
            ent.dead = true;
            lives -= 1;
            ship.invuln = 1.5;
            spawnSplash(ship.x, ship.y, "#ffffff");
            updateHud();
            if (lives <= 0) {
              gameOver();
              return;
            }
          } else {
            ent.dead = true;
            score += ent.points;
            spawnSplash(ent.x, ent.y, "#ffe08a");
            updateHud();
          }
        }
      }
      entities = entities.filter((e) => !e.dead);
    }

    // particles
    for (const p of particles) {
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 260 * dt;
    }
    particles = particles.filter((p) => p.age < p.life);

    updateHud();
  }

  // ---- Draw ----
  function drawOcean() {
    ctx.fillStyle = "#0466a1";
    ctx.fillRect(0, 0, W, H);
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "rgba(63,169,221,0.9)");
    grad.addColorStop(1, "rgba(2,48,71,0.95)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 3;
    const spacing = 60;
    for (let i = -1; i < H / spacing + 1; i++) {
      const y = ((i * spacing + waveOffset) % (H + spacing)) - spacing;
      ctx.beginPath();
      for (let x = 0; x <= W; x += 20) {
        const wy = y + Math.sin((x + waveOffset) * 0.02) * 6;
        if (x === 0) ctx.moveTo(x, wy);
        else ctx.lineTo(x, wy);
      }
      ctx.stroke();
    }
  }

  function drawShip() {
    ctx.save();
    ctx.translate(ship.x, ship.y);
    if (ship.invuln > 0 && Math.floor(ship.invuln * 12) % 2 === 0) {
      ctx.globalAlpha = 0.4;
    }
    ctx.font = "50px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.save();
    ctx.scale(1, -1);
    ctx.fillText("🚢", 0, 2);
    ctx.restore();
    ctx.restore();
  }

  function drawEntities() {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const ent of entities) {
      ctx.save();
      ctx.translate(ent.x, ent.y);
      ctx.rotate(ent.angle * 0.3);
      ctx.font = `${ent.r * 1.7}px serif`;
      ctx.fillText(ent.emoji, 0, 0);
      ctx.restore();
    }
  }

  function drawParticles() {
    for (const p of particles) {
      const alpha = 1 - p.age / p.life;
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(alpha, 0);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  function draw() {
    drawOcean();
    drawEntities();
    drawShip();
    drawParticles();
  }

  function loop(now) {
    if (state !== STATE.PLAYING) return;
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  // ---- Initial screen ----
  overlayBody.innerHTML = `<p class="result">Best score: <strong>${best}</strong></p>`;
  draw();
})();
