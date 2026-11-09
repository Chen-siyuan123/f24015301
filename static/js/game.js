/* 游戏主逻辑：物理世界、弹弓操作、小鸟技能、关卡流程 */
const Game = {
  engine: null,
  world: null,
  state: null,
  progress: {},
  lastTs: 0,
  frameAcc: 0,
  trailsPos: 0,

  init() {
    const { Engine } = Matter;
    this.engine = Engine.create({
      gravity: { x: 0, y: PHYSICS.gravity },
      positionIterations: 8,
      velocityIterations: 6
    });
    this.world = this.engine.world;

    this.progress = this.loadProgress();
    Renderer.init(document.getElementById('stage'));
    UI.init(this);
    UI.showStart();

    this.resetState();
    this.buildLevel(0);

    Matter.Events.on(this.engine, 'collisionStart', (ev) => this.onCollisions(ev));

    this.bindInput();
    this.loopBound = (ts) => this.loop(ts);
    requestAnimationFrame(this.loopBound);
  },

  resetState() {
    this.state = {
      phase: 'start',
      levelIndex: 0,
      levelName: '',
      levelSub: '',
      score: 0,
      queue: [],
      bird: null,
      birds: [],
      blocks: [],
      pigs: [],
      particles: [],
      trail: [],
      preview: [],
      clouds: this.makeClouds(),
      shake: 0,
      stretchRatio: 0,
      shots: 0,
      settleTimer: 0,
      resultTimer: 0,
      resultShown: false,
      tipTimer: 0,
      hitSfxAt: 0,
      time: 0
    };
  },

  makeClouds() {
    return [
      { x: 180, y: 130, s: 1.1, speed: 6 },
      { x: 640, y: 90, s: 0.85, speed: 9 },
      { x: 1010, y: 180, s: 1.25, speed: 5 },
      { x: 1380, y: 90, s: 0.7, speed: 11 },
      { x: 460, y: 250, s: 0.6, speed: 7 }
    ];
  },

  loadProgress() {
    try {
      return JSON.parse(localStorage.getItem('ab_progress_v1')) || {};
    } catch (err) {
      return {};
    }
  },

  saveProgress() {
    try {
      localStorage.setItem('ab_progress_v1', JSON.stringify(this.progress));
    } catch (err) { /* ignore */ }
  },

  /* ---------------- level building ---------------- */
  buildLevel(index) {
    const { Bodies, Composite } = Matter;
    const s = this.state;
    const lv = LEVELS[index];

    Composite.clear(this.world, false, true);
    s.levelIndex = index;
    s.levelName = lv.name;
    s.levelSub = lv.sub;
    s.score = 0;
    s.blocks = [];
    s.pigs = [];
    s.birds = [];
    s.bird = null;
    s.queue = lv.birds.slice();
    s.particles = [];
    s.trail = [];
    s.preview = [];
    s.shots = 0;
    s.settleTimer = 0;
    s.resultShown = false;
    s.resultTimer = 0;
    s.shake = 0;

    const ground = Bodies.rectangle(WORLD.width / 2, WORLD.groundY + 60, WORLD.width + 200, 120, {
      isStatic: true, friction: 0.9, frictionStatic: 1
    });
    ground.game = { kind: 'ground' };
    Composite.add(this.world, ground);

    for (const b of lv.blocks) {
      const mat = MATERIALS[b.m];
      const body = Bodies.rectangle(b.x, b.y, b.w, b.h, {
        density: mat.density,
        friction: mat.friction,
        frictionStatic: 1,
        slop: 0.02
      });
      body.game = { kind: 'block', m: b.m, w: b.w, h: b.h, hp: mat.hp, maxHp: mat.hp, seed: Math.floor(b.x * 7 + b.y * 3) };
      s.blocks.push(body);
      Composite.add(this.world, body);
    }

    for (const p of lv.pigs) {
      const pig = Bodies.circle(p.x, p.y, 26, {
        density: 0.0025,
        friction: 0.6,
        frictionStatic: 1,
        frictionAir: 0.008,
        restitution: 0.05
      });
      pig.game = { kind: 'pig', r: 26, hp: 110, maxHp: 110, seed: Math.floor(p.x + p.y) };
      s.pigs.push(pig);
      Composite.add(this.world, pig);
    }

    s.phase = 'idle';
    this.loadBird();
    UI.updateHud(s);
  },

  loadBird() {
    const s = this.state;
    if (!s.queue.length) {
      s.bird = null;
      this.lose();
      return;
    }
    const { Bodies, Composite, Body } = Matter;
    const type = s.queue.shift();
    const info = BIRD_INFO[type];
    const bird = Bodies.circle(SLING.x, SLING.y, info.radius, {
      density: info.density,
      friction: 0.35,
      frictionAir: 0.003,
      restitution: 0.35,
      isStatic: true,
      collisionFilter: { mask: 0 }
    });
    bird.game = { kind: 'bird', type, r: info.radius, usedAbility: false, active: false, dead: false, flash: 0, alpha: 1 };
    Composite.add(this.world, bird);
    s.bird = bird;
    s.birds.push(bird);
    s.phase = 'idle';
    s.settleTimer = 0;
    UI.updateHud(s);
  },

  /* ---------------- input ---------------- */
  bindInput() {
    const canvas = Renderer.canvas;
    canvas.addEventListener('pointerdown', (ev) => this.onPointerDown(ev));
    canvas.addEventListener('pointermove', (ev) => this.onPointerMove(ev));
    canvas.addEventListener('pointerup', (ev) => this.onPointerUp(ev));
    canvas.addEventListener('pointercancel', (ev) => this.onPointerUp(ev));
    canvas.addEventListener('contextmenu', (ev) => ev.preventDefault());
    window.addEventListener('keydown', (ev) => {
      if (ev.key === 'r' || ev.key === 'R') {
        if (this.state.phase !== 'start') this.restartLevel();
      }
    });
  },

  onPointerDown(ev) {
    const s = this.state;
    if (s.phase === 'won' || s.phase === 'lost' || s.phase === 'start') return;
    Sound.ensure();
    const p = Renderer.toWorld(ev.clientX, ev.clientY);

    if (s.phase === 'idle' && s.bird) {
      const b = s.bird;
      if (Math.hypot(p.x - b.position.x, p.y - b.position.y) < 130) {
        s.phase = 'dragging';
        s.dragId = ev.pointerId;
        Renderer.canvas.setPointerCapture(ev.pointerId);
        this.dragTo(p);
        Sound.stretch();
      }
    } else if (s.phase === 'flying') {
      this.useAbility();
    }
  },

  onPointerMove(ev) {
    if (this.state.phase !== 'dragging' || ev.pointerId !== this.state.dragId) return;
    this.dragTo(Renderer.toWorld(ev.clientX, ev.clientY));
  },

  onPointerUp(ev) {
    const s = this.state;
    if (s.phase !== 'dragging' || ev.pointerId !== s.dragId) return;
    s.dragId = null;
    const b = s.bird;
    if (!b) return;
    const dx = SLING.x - b.position.x;
    const dy = SLING.y - b.position.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 12) {
      Matter.Body.setPosition(b, { x: SLING.x, y: SLING.y });
      s.phase = 'idle';
      s.preview = [];
      s.stretchRatio = 0;
      return;
    }
    this.launch(dx, dy);
  },

  dragTo(p) {
    const s = this.state;
    const b = s.bird;
    let dx = p.x - SLING.x;
    let dy = p.y - SLING.y;
    const len = Math.hypot(dx, dy) || 1;
    if (len > SLING.maxStretch) {
      dx = dx / len * SLING.maxStretch;
      dy = dy / len * SLING.maxStretch;
    }
    Matter.Body.setPosition(b, { x: SLING.x + dx, y: SLING.y + dy });
    s.stretchRatio = Math.min(1, len / SLING.maxStretch);
    s.preview = this.buildPreview(SLING.x + dx, SLING.y + dy, -dx, -dy);
  },

  buildPreview(startX, startY, dirX, dirY) {
    const f = PHYSICS.launchFactor;
    let vx = dirX * f;
    let vy = dirY * f;
    let px = startX;
    let py = startY;
    const dots = [];
    for (let i = 1; i < 260; i++) {
      vx *= 0.997;
      vy = vy * 0.997 + PHYSICS.gravityAccel;
      px += vx;
      py += vy;
      if (py > WORLD.groundY - 8 || px > WORLD.width - 4 || px < -40) break;
      if (i % 7 === 0) dots.push({ x: px, y: py });
      if (dots.length >= 24) break;
    }
    return dots;
  },

  launch(dx, dy) {
    const s = this.state;
    const { Body } = Matter;
    const b = s.bird;
    const f = PHYSICS.launchFactor;

    Body.setStatic(b, false);
    b.collisionFilter.mask = 0xffffffff;
    Body.setVelocity(b, { x: dx * f, y: dy * f });
    Body.setAngularVelocity(b, dx * 0.0008);
    b.game.active = true;

    s.phase = 'flying';
    s.shots += 1;
    s.preview = [];
    s.stretchRatio = 0;
    s.settleTimer = 0;
    s.trail = [];
    this.trailPos = 0;
    s.shake = Math.max(s.shake, 0.18);
    Sound.launch();
    UI.showTip(this.abilityTip(b.game.type));
    s.tipTimer = 2.6;
    UI.updateHud(s);
  },

  abilityTip(type) {
    const info = BIRD_INFO[type];
    if (type === 'red') return '红鸟没有特殊技能，靠体重硬撞！';
    return `飞行中点击屏幕：${info.name} · ${info.ability}`;
  },

  useAbility() {
    const s = this.state;
    const b = s.bird;
    if (!b || !b.game || !b.game.active || b.game.usedAbility) return;
    const { Body, Bodies, Composite } = Matter;
    const g = b.game;
    g.usedAbility = true;
    g.flash = 10;

    if (g.type === 'yellow') {
      Body.setVelocity(b, { x: b.velocity.x * 1.75, y: b.velocity.y * 1.75 });
      this.burst(b.position, '#ffd75e', 10);
      s.shake = Math.max(s.shake, 0.35);
      Sound.boost();
    } else if (g.type === 'blue') {
      const v = b.velocity;
      for (const sign of [-1, 1]) {
        const nx = b.position.x;
        const ny = b.position.y;
        const extra = Bodies.circle(nx, ny, 14, {
          density: 0.014, friction: 0.3, frictionAir: 0.003, restitution: 0.4
        });
        extra.game = { kind: 'bird', type: 'blue', r: 14, usedAbility: true, active: true, dead: false, flash: 0, alpha: 1 };
        Composite.add(this.world, extra);
        Body.setVelocity(extra, {
          x: v.x + sign * 2.4,
          y: v.y - sign * 3.4
        });
        s.birds.push(extra);
      }
      this.burst(b.position, '#8fe6ff', 12);
      Sound.split();
    } else if (g.type === 'black') {
      this.explode(b.position, 310);
      this.removeBird(b);
      s.bird = null;
      s.shake = 1;
      Sound.boom();
    } else {
      Body.setVelocity(b, { x: b.velocity.x * 1.08, y: b.velocity.y + 7 });
      s.shake = Math.max(s.shake, 0.2);
      Sound.boost();
    }
  },

  explode(pos, radius) {
    const bodies = this.world.bodies.slice();
    for (const body of bodies) {
      const g = body.game;
      if (!g || g.kind === 'ground' || g.kind === 'bird' || g.dead) continue;
      const dx = body.position.x - pos.x;
      const dy = body.position.y - pos.y;
      const dist = Math.hypot(dx, dy);
      if (dist > radius) continue;
      const fall = 1 - dist / radius;
      this.damage(body, 230 * fall, { cause: 'boom' });
      const nx = (dx / (dist || 1));
      const ny = (dy / (dist || 1));
      Matter.Body.setVelocity(body, {
        x: body.velocity.x + nx * fall * 9,
        y: body.velocity.y + ny * fall * 9 - fall * 3
      });
    }
    this.burst(pos, '#ffb703', 32, true);
  },

  /* ---------------- collisions & damage ---------------- */
  onCollisions(ev) {
    const s = this.state;
    if (!s || s.phase === 'won' || s.phase === 'lost') return;
    for (const pair of ev.pairs) {
      this.handlePair(pair.bodyA, pair.bodyB);
      this.handlePair(pair.bodyB, pair.bodyA);
    }
  },

  handlePair(target, other) {
    const g = target.game;
    const og = other.game;
    if (!g || g.kind === 'ground' || g.kind === 'bird' || g.dead) return;
    if (!og || og.dead) return;
    const speed = Math.hypot(target.velocity.x - other.velocity.x, target.velocity.y - other.velocity.y);
    if (speed < 4.5) return;

    const isBird = og.kind === 'bird';
    const isPigTarget = g.kind === 'pig';
    let dmg;
    if (isBird) {
      const mult = og.type === 'red' ? 1.7 : og.type === 'black' ? 1.5 : 1.15;
      dmg = speed * (isPigTarget ? 9 : 6.5) * mult;
    } else {
      dmg = speed * (isPigTarget ? 5.5 : 3.4);
    }
    this.damage(target, dmg, { cause: isBird ? 'bird' : 'block' });

    if (isBird) {
      const now = performance.now();
      if (now - this.state.hitSfxAt > 120) {
        this.state.hitSfxAt = now;
        Sound.hit(Math.min(1.2, speed / 22));
      }
      other.game.flash = 4;
    }
    if (speed > 19) this.state.shake = Math.max(this.state.shake, 0.35);
  },

  damage(body, amount, opts = {}) {
    const g = body.game;
    if (!g || g.dead || g.kind === 'bird' || g.kind === 'ground') return;
    g.hp -= amount;
    if (g.hp <= 0) {
      this.destroy(body, opts);
    }
  },

  destroy(body, opts = {}) {
    const g = body.game;
    if (g.dead) return;
    g.dead = true;
    const s = this.state;
    Matter.Composite.remove(this.world, body);

    if (g.kind === 'block') {
      s.blocks = s.blocks.filter(b => b !== body);
      s.score += 150;
      this.debris(body.position, g);
      this.state.shake = Math.max(this.state.shake, 0.28);
      if (g.m === 'glass') Sound.glassBreak();
      else if (g.m === 'stone') Sound.stoneBreak();
      else Sound.woodBreak();
    } else if (g.kind === 'pig') {
      s.pigs = s.pigs.filter(p => p !== body);
      s.score += 900;
      this.burst(body.position, '#8fd45f', 16, false, true);
      Sound.pop();
      this.state.shake = Math.max(this.state.shake, 0.3);
      if (!s.pigs.length) this.win();
    }
    UI.updateHud(s);
  },

  removeBird(b) {
    if (!b || b.game.dead) return;
    b.game.dead = true;
    Matter.Composite.remove(this.world, b);
    this.state.birds = this.state.birds.filter(x => x !== b);
  },

  /* ---------------- flow ---------------- */
  startFromStartScreen() {
    let idx = LEVELS.findIndex(lv => !(this.progress[lv.id] && this.progress[lv.id].stars));
    if (idx < 0) idx = 0;
    this.startLevel(idx);
  },

  startLevel(index) {
    UI.hideStart();
    UI.hideResult();
    UI.hideLevels();
    this.buildLevel(index);
    UI.showTip('拖动小鸟瞄准，松手发射；飞行中点击屏幕释放技能');
    this.state.tipTimer = 3.6;
    Sound.click();
  },

  restartLevel() {
    this.startLevel(this.state.levelIndex);
  },

  nextLevel() {
    const next = (this.state.levelIndex + 1) % LEVELS.length;
    this.startLevel(next);
  },

  win() {
    const s = this.state;
    if (s.phase === 'won' || s.phase === 'lost') return;
    s.phase = 'won';
    const bonus = s.queue.length * 800;
    s.score += bonus;
    const stars = s.shots <= 1 ? 3 : s.shots <= 2 ? 2 : 1;
    const lv = LEVELS[s.levelIndex];
    const rec = this.progress[lv.id] || { stars: 0, best: 0 };
    this.progress[lv.id] = {
      stars: Math.max(rec.stars, stars),
      best: Math.max(rec.best, s.score)
    };
    this.saveProgress();
    this.confetti();
    Sound.win();
    s.resultTimer = 1.0;
    s.resultShown = false;
    s.resultData = {
      win: true,
      score: s.score,
      stars,
      levelIndex: s.levelIndex,
      extra: bonus ? `剩余小鸟奖励 +${bonus}` : '全部小鸟都用上啦'
    };
    UI.hideTip();
    UI.updateHud(s);
  },

  lose() {
    const s = this.state;
    if (s.phase === 'won' || s.phase === 'lost') return;
    s.phase = 'lost';
    s.resultTimer = 0.9;
    s.resultShown = false;
    s.resultData = {
      win: false,
      score: s.score,
      stars: 0,
      levelIndex: s.levelIndex,
      extra: '还有捣蛋猪没被消灭，再试一次吧'
    };
    Sound.lose();
    UI.hideTip();
  },

  endShot() {
    const s = this.state;
    if (s.phase === 'won' || s.phase === 'lost') return;
    for (const b of s.birds.slice()) this.removeBird(b);
    s.bird = null;
    s.preview = [];
    s.trail = [];
    s.settleTimer = 0;

    if (!s.pigs.length) { this.win(); return; }
    if (!s.queue.length) { this.lose(); return; }
    this.loadBird();
    UI.showTip('还剩 ' + s.queue.length + ' 只小鸟，继续瞄准');
    s.tipTimer = 2.4;
  },

  /* ---------------- particles ---------------- */
  burst(pos, color, count, big = false, pig = false) {
    const colors = pig ? ['#8fd45f', '#b6e88a', '#6fb844'] : [color, '#ffffff'];
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const sp = (big ? 260 : 160) * (0.3 + Math.random() * 0.8);
      this.state.particles.push({
        x: pos.x, y: pos.y,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp - 80,
        r: big ? 5 + Math.random() * 5 : 3 + Math.random() * 4,
        color: colors[i % colors.length],
        life: 0.6 + Math.random() * 0.4,
        maxLife: 1,
        shape: 'circle',
        rot: 0
      });
    }
  },

  debris(pos, g) {
    const mat = MATERIALS[g.m];
    for (let i = 0; i < 8; i++) {
      this.state.particles.push({
        x: pos.x + (Math.random() - 0.5) * g.w,
        y: pos.y + (Math.random() - 0.5) * g.h,
        vx: (Math.random() - 0.5) * 320,
        vy: -Math.random() * 260 - 40,
        r: 3 + Math.random() * 5,
        color: [mat.fill, mat.dark, mat.light][i % 3],
        life: 0.7 + Math.random() * 0.5,
        maxLife: 1.2,
        shape: 'rect',
        rot: Math.random() * 3,
        rv: (Math.random() - 0.5) * 8
      });
    }
  },

  confetti() {
    const colors = ['#e63946', '#ffc93c', '#4cc0e8', '#8fd45f', '#ff7b54', '#fff'];
    for (let i = 0; i < 70; i++) {
      this.state.particles.push({
        x: 200 + Math.random() * 1200,
        y: -Math.random() * 300,
        vx: (Math.random() - 0.5) * 120,
        vy: 120 + Math.random() * 180,
        r: 4 + Math.random() * 4,
        color: colors[i % colors.length],
        life: 2.2 + Math.random(),
        maxLife: 3.2,
        shape: 'rect',
        rot: Math.random() * 3,
        rv: (Math.random() - 0.5) * 6
      });
    }
  },

  /* ---------------- update / loop ---------------- */
  loop(ts) {
    requestAnimationFrame(this.loopBound);
    const now = ts / 1000;
    if (!this.lastTs) this.lastTs = now;
    let dt = Math.min(0.05, now - this.lastTs);
    this.lastTs = now;
    this.state.time = now;

    this.frameAcc += dt;
    const step = 1 / 60;
    let guard = 0;
    while (this.frameAcc >= step && guard < 4) {
      Matter.Engine.update(this.engine, 1000 / 60);
      this.frameAcc -= step;
      guard++;
    }
    if (guard >= 4) this.frameAcc = 0;

    this.update(dt);
    Renderer.draw(this.state, now);
  },

  update(dt) {
    const s = this.state;

    if (s.shake > 0) s.shake = Math.max(0, s.shake - dt * 2.6);

    if (s.tipTimer > 0) {
      s.tipTimer -= dt;
      if (s.tipTimer <= 0) UI.hideTip();
    }

    // 粒子
    for (const p of s.particles) {
      p.vy += 360 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.995;
      if (p.rv) p.rot += p.rv * dt;
      p.life -= dt;
    }
    s.particles = s.particles.filter(p => p.life > 0);

    // 拖尾
    if (s.phase === 'flying') {
      this.trailPos += dt;
      if (this.trailPos > 0.04) {
        this.trailPos = 0;
        for (const b of s.birds) {
          s.trail.push({ x: b.position.x, y: b.position.y, life: 0.45, r: b.game.r * 0.7 });
        }
        if (s.trail.length > 40) s.trail.splice(0, s.trail.length - 40);
      }
    }
    for (const t of s.trail) t.life -= dt;
    s.trail = s.trail.filter(t => t.life > 0);

    for (const b of s.birds) if (b.game.flash > 0) b.game.flash -= 1;

    // 飞出屏幕的猪与小鸟
    for (const p of s.pigs.slice()) {
      if (p.position.y > WORLD.height + 120) {
        s.pigs = s.pigs.filter(x => x !== p);
        Matter.Composite.remove(this.world, p);
        s.score += 400;
        if (!s.pigs.length) this.win();
        UI.updateHud(s);
      }
    }
    for (const b of s.birds.slice()) {
      if (b.position.x > WORLD.width + 90 || b.position.x < -120 || b.position.y > WORLD.height + 140) {
        this.removeBird(b);
        if (s.bird === b) s.bird = null;
      }
    }

    // 静止判定
    if (s.phase === 'flying') {
      if (!s.birds.length) {
        s.settleTimer += dt;
        if (s.settleTimer > 0.8) this.endShot();
      } else {
        let moving = false;
        for (const b of s.birds) {
          if (!b.game.active) continue;
          if (Math.hypot(b.velocity.x, b.velocity.y) > 1.4) { moving = true; break; }
        }
        s.settleTimer = moving ? 0 : s.settleTimer + dt;
        if (s.settleTimer > 1.1) this.endShot();
      }
    }

    // 结算展示
    if ((s.phase === 'won' || s.phase === 'lost') && !s.resultShown) {
      s.resultTimer -= dt;
      if (s.resultTimer <= 0) {
        s.resultShown = true;
        UI.showResult(s.resultData);
      }
    }
  }
};

window.addEventListener('load', () => Game.init());
window.Game = Game;
