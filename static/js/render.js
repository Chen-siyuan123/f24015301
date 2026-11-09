/* 画面渲染：用 Canvas 2D 手绘卡通风格场景 */
const Renderer = {
  canvas: null,
  ctx: null,
  w: 0, h: 0, dpr: 1, scale: 1, ox: 0, oy: 0,

  init(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());
  },

  resize() {
    this.dpr = window.devicePixelRatio || 1;
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
    this.scale = Math.min(this.w / WORLD.width, this.h / WORLD.height);
    this.ox = (this.w - WORLD.width * this.scale) / 2;
    this.oy = (this.h - WORLD.height * this.scale) / 2;
  },

  toWorld(clientX, clientY) {
    return {
      x: (clientX - this.ox) / this.scale,
      y: (clientY - this.oy) / this.scale
    };
  },

  rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  },

  draw(state, t) {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);

    const sky = ctx.createLinearGradient(0, 0, 0, this.h);
    sky.addColorStop(0, '#61b8e8');
    sky.addColorStop(0.45, '#a9e0f7');
    sky.addColorStop(1, '#eaf9ff');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, this.w, this.h);

    const shake = state.shake > 0 ? state.shake : 0;
    const sx = shake ? (Math.random() - 0.5) * 22 * shake : 0;
    const sy = shake ? (Math.random() - 0.5) * 18 * shake : 0;

    ctx.translate(this.ox + sx, this.oy + sy);
    ctx.scale(this.scale, this.scale);

    ctx.save();
    ctx.beginPath();
    ctx.rect(-4, -4, WORLD.width + 8, WORLD.height + 8);
    ctx.clip();

    this.drawSky(t, state);
    this.drawHills();
    this.drawGround(t);
    this.drawSlingBack(state);
    this.drawWaitingBirds(state);
    this.drawBlocks(state);
    this.drawPigs(state, t);
    this.drawTrail(state);
    this.drawBirds(state);
    this.drawSlingFront(state, t);
    this.drawPreview(state);
    this.drawParticles(state);
    this.drawForeground(t);

    ctx.restore();
  },

  /* ---------------- background ---------------- */
  drawSky(t, state) {
    const ctx = this.ctx;

    // 太阳
    const sunX = 1370, sunY = 150;
    const glow = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 150);
    glow.addColorStop(0, 'rgba(255, 246, 190, .95)');
    glow.addColorStop(0.4, 'rgba(255, 238, 160, .35)');
    glow.addColorStop(1, 'rgba(255, 238, 160, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 150, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff6c4';
    ctx.beginPath();
    ctx.arc(sunX, sunY, 46, 0, Math.PI * 2);
    ctx.fill();

    // 云
    const clouds = state.clouds;
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    for (const c of clouds) {
      const x = ((c.x + t * c.speed) % 1800) - 100;
      const y = c.y + Math.sin(t * 0.4 + c.x) * 3;
      const s = c.s;
      ctx.beginPath();
      ctx.arc(x, y, 26 * s, 0, Math.PI * 2);
      ctx.arc(x + 30 * s, y - 12 * s, 22 * s, 0, Math.PI * 2);
      ctx.arc(x + 62 * s, y, 24 * s, 0, Math.PI * 2);
      ctx.arc(x + 30 * s, y + 10 * s, 26 * s, 0, Math.PI * 2);
      ctx.fill();
    }
  },

  drawHills() {
    const ctx = this.ctx;

    ctx.fillStyle = '#9ed9b9';
    ctx.beginPath();
    ctx.moveTo(-40, WORLD.groundY);
    ctx.quadraticCurveTo(230, 470, 560, WORLD.groundY);
    ctx.quadraticCurveTo(830, 400, 1120, WORLD.groundY);
    ctx.quadraticCurveTo(1400, 520, 1660, WORLD.groundY);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#7cc79d';
    ctx.beginPath();
    ctx.moveTo(-40, WORLD.groundY);
    ctx.quadraticCurveTo(330, 600, 700, WORLD.groundY);
    ctx.quadraticCurveTo(1000, 590, 1250, WORLD.groundY);
    ctx.quadraticCurveTo(1500, 630, 1660, WORLD.groundY);
    ctx.closePath();
    ctx.fill();

    // 远处小树
    const trees = [[120, 612], [400, 630], [610, 648], [980, 636], [1450, 640]];
    for (const [x, y] of trees) {
      ctx.fillStyle = '#6b4b2a';
      ctx.fillRect(x - 4, y, 8, WORLD.groundY - y);
      ctx.fillStyle = '#4f9e63';
      ctx.beginPath();
      ctx.arc(x, y - 4, 26, 0, Math.PI * 2);
      ctx.arc(x - 18, y + 6, 18, 0, Math.PI * 2);
      ctx.arc(x + 18, y + 4, 20, 0, Math.PI * 2);
      ctx.fill();
    }
  },

  drawGround(t) {
    const ctx = this.ctx;
    const gy = WORLD.groundY;

    ctx.fillStyle = '#8b5e34';
    ctx.fillRect(0, gy, WORLD.width, WORLD.height - gy);

    ctx.fillStyle = '#6d4624';
    for (let x = 0; x < WORLD.width; x += 64) {
      const y = gy + 26 + (x % 128 === 0 ? 8 : 0);
      ctx.beginPath();
      ctx.ellipse(x + 30, y, 22, 8, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    const grass = ctx.createLinearGradient(0, gy - 10, 0, gy + 34);
    grass.addColorStop(0, '#7ec85a');
    grass.addColorStop(1, '#4d9a37');
    ctx.fillStyle = grass;
    ctx.beginPath();
    ctx.moveTo(0, gy + 18);
    for (let x = 0; x <= WORLD.width; x += 24) {
      ctx.lineTo(x, gy - 6 + Math.sin(x * 0.12) * 4);
    }
    ctx.lineTo(WORLD.width, gy + 18);
    ctx.closePath();
    ctx.fill();

    // 草叶
    ctx.strokeStyle = '#3f8c2d';
    ctx.lineWidth = 3;
    for (let i = 0; i < 60; i++) {
      const x = (i * 53 + 17) % WORLD.width;
      const h = 8 + (i % 4) * 3;
      ctx.beginPath();
      ctx.moveTo(x, gy + 2);
      ctx.quadraticCurveTo(x + 4, gy - h, x + 9, gy - h - 2);
      ctx.stroke();
    }

    if (t) { /* 保留时间参数，便于后续添加动画 */ }
  },

  /* ---------------- slingshot ---------------- */
  drawSlingPost(x, y, h, w) {
    const ctx = this.ctx;
    const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    g.addColorStop(0, '#8d5a2b');
    g.addColorStop(0.45, '#b5793f');
    g.addColorStop(1, '#7a4a22');
    ctx.fillStyle = g;
    this.rr(ctx, x - w / 2, y - h, w, h, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(60,35,12,.35)';
    ctx.lineWidth = 2;
    this.rr(ctx, x - w / 2, y - h, w, h, 8);
    ctx.stroke();
  },

  drawSlingBack(state) {
    const ctx = this.ctx;
    const baseY = WORLD.groundY + 2;
    // 主干
    this.drawSlingPost(SLING.x, baseY, 128, 30);
    // 左右叉
    ctx.save();
    ctx.translate(SLING.x, SLING.y + 55);
    ctx.rotate(-0.36);
    this.drawSlingPost(0, 0, 105, 22);
    ctx.restore();
    ctx.save();
    ctx.translate(SLING.x, SLING.y + 55);
    ctx.rotate(0.36);
    this.drawSlingPost(0, 0, 105, 22);
    ctx.restore();

    // 皮筋（后侧）
    const b = state.bird;
    if (b && (state.phase === 'idle' || state.phase === 'dragging' || state.phase === 'launching')) {
      ctx.strokeStyle = '#53301a';
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.moveTo(SLING.x - 37, SLING.y - 44);
      ctx.lineTo(b.position.x, b.position.y);
      ctx.stroke();
    }
  },

  drawSlingFront(state, t) {
    const ctx = this.ctx;
    const b = state.bird;
    if (b && (state.phase === 'idle' || state.phase === 'dragging' || state.phase === 'launching')) {
      ctx.strokeStyle = '#3f2413';
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.moveTo(SLING.x + 37, SLING.y - 44);
      ctx.lineTo(b.position.x, b.position.y);
      ctx.stroke();
    }
    // 拉满时的震动提示
    if (state.phase === 'dragging' && state.stretchRatio > 0.93) {
      ctx.strokeStyle = `rgba(255,255,255,${0.25 + Math.sin(t * 12) * 0.15})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(SLING.x, SLING.y, 58, 0, Math.PI * 2);
      ctx.stroke();
    }
  },

  drawWaitingBirds(state) {
    const queue = state.queue;
    for (let i = 0; i < queue.length; i++) {
      const x = 72 + i * 38;
      const y = WORLD.groundY - 15;
      this.drawBirdShape(queue[i], x, y, 14, Math.PI, 1);
    }
  },

  /* ---------------- blocks / pigs ---------------- */
  drawBlocks(state) {
    const ctx = this.ctx;
    for (const b of state.blocks) {
      const g = b.game;
      const mat = MATERIALS[g.m];
      const hpRatio = Math.max(0, g.hp / g.maxHp);

      ctx.save();
      ctx.translate(b.position.x, b.position.y);
      ctx.rotate(b.angle);

      if (g.m === 'glass') {
        ctx.fillStyle = 'rgba(198,239,250,.72)';
        ctx.strokeStyle = 'rgba(255,255,255,.9)';
        ctx.lineWidth = 2;
        this.rr(ctx, -g.w / 2, -g.h / 2, g.w, g.h, 5);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.55)';
        ctx.beginPath();
        ctx.moveTo(-g.w / 2 + 5, g.h / 2 - 6);
        ctx.lineTo(g.w / 2 - 10, -g.h / 2 + 6);
        ctx.lineTo(g.w / 2 - 3, -g.h / 2 + 6);
        ctx.lineTo(-g.w / 2 + 12, g.h / 2 - 6);
        ctx.closePath();
        ctx.fill();
        if (hpRatio < 0.8) this.drawCrack(g, hpRatio, '#6fb3c7');
      } else if (g.m === 'stone') {
        const grad = ctx.createLinearGradient(0, -g.h / 2, 0, g.h / 2);
        grad.addColorStop(0, mat.light);
        grad.addColorStop(0.6, mat.fill);
        grad.addColorStop(1, mat.dark);
        ctx.fillStyle = grad;
        this.rr(ctx, -g.w / 2, -g.h / 2, g.w, g.h, 4);
        ctx.fill();
        ctx.strokeStyle = 'rgba(70,80,90,.35)';
        ctx.lineWidth = 2;
        this.rr(ctx, -g.w / 2, -g.h / 2, g.w, g.h, 4);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.25)';
        for (let i = 0; i < 4; i++) {
          const px = -g.w / 2 + 8 + ((i * 31) % Math.max(1, g.w - 16));
          const py = -g.h / 2 + 10 + ((i * 47) % Math.max(1, g.h - 20));
          ctx.beginPath();
          ctx.arc(px, py, 3, 0, Math.PI * 2);
          ctx.fill();
        }
        if (hpRatio < 0.8) this.drawCrack(g, hpRatio, '#54616d');
      } else {
        const grad = ctx.createLinearGradient(0, -g.h / 2, 0, g.h / 2);
        grad.addColorStop(0, mat.light);
        grad.addColorStop(0.5, mat.fill);
        grad.addColorStop(1, mat.dark);
        ctx.fillStyle = grad;
        this.rr(ctx, -g.w / 2, -g.h / 2, g.w, g.h, 6);
        ctx.fill();
        ctx.strokeStyle = 'rgba(90,55,22,.4)';
        ctx.lineWidth = 2;
        this.rr(ctx, -g.w / 2, -g.h / 2, g.w, g.h, 6);
        ctx.stroke();
        // 木纹
        ctx.strokeStyle = 'rgba(110,70,30,.28)';
        ctx.lineWidth = 1.5;
        if (g.w >= g.h) {
          for (let i = 1; i < 4; i++) {
            const y = -g.h / 2 + (g.h / 4) * i;
            ctx.beginPath();
            ctx.moveTo(-g.w / 2 + 5, y);
            ctx.bezierCurveTo(-g.w / 6, y + 2, g.w / 6, y - 2, g.w / 2 - 5, y);
            ctx.stroke();
          }
        } else {
          for (let i = 1; i < 4; i++) {
            const x = -g.w / 2 + (g.w / 4) * i;
            ctx.beginPath();
            ctx.moveTo(x, -g.h / 2 + 5);
            ctx.bezierCurveTo(x + 2, -g.h / 6, x - 2, g.h / 6, x, g.h / 2 - 5);
            ctx.stroke();
          }
        }
        if (hpRatio < 0.8) this.drawCrack(g, hpRatio, '#5e3a17');
      }

      ctx.restore();
    }
  },

  drawCrack(g, ratio, color) {
    const ctx = this.ctx;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.55;
    const n = ratio < 0.45 ? 3 : 2;
    for (let i = 0; i < n; i++) {
      const seed = g.seed + i * 37;
      const x0 = -g.w / 2 + (seed % Math.max(1, g.w));
      ctx.beginPath();
      ctx.moveTo(x0, -g.h / 2 + 2);
      ctx.lineTo(x0 + ((seed % 9) - 4), -g.h / 2 + g.h * 0.35);
      ctx.lineTo(x0 + ((seed % 5) - 2), -g.h / 2 + g.h * 0.6);
      ctx.lineTo(x0 + ((seed % 13) - 6), g.h / 2 - 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  },

  drawPigs(state, t) {
    for (const p of state.pigs) {
      const g = p.game;
      const hurt = 1 - Math.max(0, g.hp / g.maxHp);
      const r = g.r;

      this.ctx.save();
      this.ctx.translate(p.position.x, p.position.y);
      this.ctx.rotate(Math.sin(t * 2 + g.seed) * 0.02 + p.angle * 0.6);
      this.drawPigShape(r, hurt);
      this.ctx.restore();
    }
  },

  drawPigShape(r, hurt) {
    const ctx = this.ctx;
    const body = hurt > 0.6 ? '#77bd52' : '#8fd45f';
    const shade = hurt > 0.6 ? '#5f9b3f' : '#6fb844';

    // 耳朵
    ctx.fillStyle = shade;
    ctx.beginPath();
    ctx.moveTo(-r * 0.75, -r * 0.6);
    ctx.lineTo(-r * 0.35, -r * 1.1);
    ctx.lineTo(-r * 0.15, -r * 0.55);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(r * 0.75, -r * 0.6);
    ctx.lineTo(r * 0.35, -r * 1.1);
    ctx.lineTo(r * 0.15, -r * 0.55);
    ctx.closePath();
    ctx.fill();

    // 身体
    const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.2, 0, 0, r * 1.1);
    grad.addColorStop(0, '#b6e88a');
    grad.addColorStop(0.55, body);
    grad.addColorStop(1, shade);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // 眼睛
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-r * 0.34, -r * 0.22, r * 0.24, 0, Math.PI * 2);
    ctx.arc(r * 0.34, -r * 0.22, r * 0.24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#20303c';
    ctx.beginPath();
    ctx.arc(-r * 0.3, -r * 0.2, r * 0.1, 0, Math.PI * 2);
    ctx.arc(r * 0.38, -r * 0.2, r * 0.1, 0, Math.PI * 2);
    ctx.fill();

    // 眉毛（受伤时愤怒）
    ctx.strokeStyle = '#3d6b2a';
    ctx.lineWidth = r * 0.09;
    ctx.beginPath();
    if (hurt > 0.35) {
      ctx.moveTo(-r * 0.55, -r * 0.55);
      ctx.lineTo(-r * 0.2, -r * 0.42);
      ctx.moveTo(r * 0.55, -r * 0.55);
      ctx.lineTo(r * 0.2, -r * 0.42);
    } else {
      ctx.moveTo(-r * 0.5, -r * 0.45);
      ctx.lineTo(-r * 0.2, -r * 0.5);
      ctx.moveTo(r * 0.5, -r * 0.45);
      ctx.lineTo(r * 0.2, -r * 0.5);
    }
    ctx.stroke();

    // 鼻子
    ctx.fillStyle = shade;
    ctx.beginPath();
    ctx.ellipse(0, r * 0.28, r * 0.42, r * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3d6b2a';
    ctx.beginPath();
    ctx.ellipse(-r * 0.15, r * 0.28, r * 0.07, r * 0.09, 0, 0, Math.PI * 2);
    ctx.ellipse(r * 0.15, r * 0.28, r * 0.07, r * 0.09, 0, 0, Math.PI * 2);
    ctx.fill();

    // 创可贴
    if (hurt > 0.5) {
      ctx.fillStyle = '#f0dfc4';
      ctx.save();
      ctx.translate(-r * 0.62, r * 0.05);
      ctx.rotate(-0.5);
      this.rr(ctx, -r * 0.26, -r * 0.09, r * 0.52, r * 0.18, 3);
      ctx.fill();
      ctx.restore();
    }
  },

  /* ---------------- birds ---------------- */
  drawBirds(state) {
    for (const b of state.birds) {
      const g = b.game;
      const flicker = g.flash > 0 && Math.floor(performance.now() / 60) % 2 === 0;
      this.ctx.save();
      if (flicker) this.ctx.globalAlpha = 0.65;
      this.drawBirdShape(g.type, b.position.x, b.position.y, g.r, b.angle, g.alpha ?? 1);
      this.ctx.restore();
    }
  },

  drawBirdShape(type, x, y, r, angle, alpha = 1) {
    const ctx = this.ctx;
    const info = BIRD_INFO[type];
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.rotate(angle);

    // 尾羽
    ctx.fillStyle = info.dark;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(-r * 0.8, i * r * 0.3);
      ctx.lineTo(-r * 1.45, i * r * 0.42 - r * 0.18);
      ctx.lineTo(-r * 1.4, i * r * 0.42 + r * 0.2);
      ctx.closePath();
      ctx.fill();
    }

    // 身体
    const grad = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.2, 0, 0, r * 1.15);
    grad.addColorStop(0, '#ffffff55');
    grad.addColorStop(0.25, info.color);
    grad.addColorStop(1, info.dark);
    ctx.fillStyle = grad;

    if (type === 'blue') {
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 1.02, r * 0.94, 0, 0, Math.PI * 2);
      ctx.fill();
      // 头顶呆毛
      ctx.fillStyle = info.dark;
      ctx.beginPath();
      ctx.moveTo(-r * 0.1, -r * 0.9);
      ctx.lineTo(r * 0.05, -r * 1.5);
      ctx.lineTo(r * 0.3, -r * 0.85);
      ctx.closePath();
      ctx.fill();
    } else if (type === 'yellow') {
      ctx.beginPath();
      ctx.moveTo(r * 1.0, 0);
      ctx.quadraticCurveTo(r * 0.3, r * 1.0, -r * 0.85, r * 0.55);
      ctx.quadraticCurveTo(-r * 1.05, -r * 0.55, r * 0.2, -r * 0.95);
      ctx.closePath();
      ctx.fill();
      // 尖头羽毛
      ctx.fillStyle = info.dark;
      ctx.beginPath();
      ctx.moveTo(-r * 0.15, -r * 0.9);
      ctx.lineTo(r * 0.12, -r * 1.55);
      ctx.lineTo(r * 0.34, -r * 0.82);
      ctx.closePath();
      ctx.fill();
    } else if (type === 'black') {
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      // 引线
      ctx.strokeStyle = '#8a6a3c';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(r * 0.05, -r * 0.95);
      ctx.quadraticCurveTo(r * 0.35, -r * 1.5, r * 0.6, -r * 1.3);
      ctx.stroke();
      ctx.fillStyle = '#ffb703';
      ctx.beginPath();
      ctx.arc(r * 0.62, -r * 1.28, 4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      // 头顶羽毛
      ctx.fillStyle = info.dark;
      ctx.beginPath();
      ctx.moveTo(-r * 0.25, -r * 0.92);
      ctx.lineTo(-r * 0.42, -r * 1.45);
      ctx.lineTo(-r * 0.02, -r * 0.98);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-r * 0.02, -r * 0.98);
      ctx.lineTo(r * 0.12, -r * 1.5);
      ctx.lineTo(r * 0.32, -r * 0.9);
      ctx.closePath();
      ctx.fill();
    }

    // 腹部
    ctx.fillStyle = type === 'black' ? '#6c737e' : '#ffe4c4';
    ctx.globalAlpha = alpha * 0.85;
    ctx.beginPath();
    ctx.ellipse(r * 0.08, r * 0.52, r * 0.48, r * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = alpha;

    // 眼睛
    const ex = r * 0.28, ey = -r * 0.28;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(ex - r * 0.22, ey, r * 0.24, 0, Math.PI * 2);
    ctx.arc(ex + r * 0.3, ey - r * 0.04, r * 0.24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1b2430';
    ctx.beginPath();
    ctx.arc(ex - r * 0.18, ey + r * 0.02, r * 0.1, 0, Math.PI * 2);
    ctx.arc(ex + r * 0.34, ey - r * 0.02, r * 0.1, 0, Math.PI * 2);
    ctx.fill();

    // 眉毛
    ctx.strokeStyle = '#1b2430';
    ctx.lineWidth = r * 0.11;
    ctx.beginPath();
    ctx.moveTo(ex - r * 0.44, ey - r * 0.36);
    ctx.lineTo(ex - r * 0.06, ey - r * 0.22);
    ctx.moveTo(ex + r * 0.56, ey - r * 0.38);
    ctx.lineTo(ex + r * 0.18, ey - r * 0.22);
    ctx.stroke();

    // 喙
    ctx.fillStyle = type === 'black' ? '#ff9f1c' : '#ffc93c';
    ctx.beginPath();
    ctx.moveTo(r * 0.72, r * 0.06);
    ctx.lineTo(r * 1.32, r * 0.2);
    ctx.lineTo(r * 0.74, r * 0.36);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  },

  drawTrail(state) {
    const ctx = this.ctx;
    for (const p of state.trail) {
      ctx.globalAlpha = Math.max(0, p.life) * 0.45;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  },

  drawPreview(state) {
    if (state.phase !== 'dragging' || !state.preview.length) return;
    const ctx = this.ctx;
    for (let i = 0; i < state.preview.length; i++) {
      const p = state.preview[i];
      const a = 1 - i / state.preview.length;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3 + a * 4.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${0.45 + a * 0.5})`;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = `rgba(35,48,61,${0.18 + a * 0.3})`;
      ctx.stroke();
    }
  },

  drawParticles(state) {
    const ctx = this.ctx;
    for (const p of state.particles) {
      const a = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      if (p.shape === 'rect') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillRect(-p.r, -p.r * 0.6, p.r * 2, p.r * 1.2);
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * (0.4 + a * 0.6), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  },

  drawForeground(t) {
    if (!t) return;
  }
};
