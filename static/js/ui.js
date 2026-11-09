/* 界面层：HUD、开始页、关卡选择、结算、排行榜 */
const UI = {
  game: null,
  els: {},

  init(game) {
    this.game = game;
    const $ = (id) => document.getElementById(id);
    this.els = {
      hud: $('hud'),
      levelName: $('level-name'),
      levelSub: $('level-sub'),
      birdsLeft: $('birds-left'),
      score: $('score'),
      btnMenu: $('btn-menu'),
      btnSound: $('btn-sound'),
      tip: $('tip'),
      start: $('screen-start'),
      btnStart: $('btn-start'),
      btnLevelsOpen: $('btn-levels-open'),
      btnLbOpen: $('btn-leaderboard-open'),
      levels: $('screen-levels'),
      levelGrid: $('level-grid'),
      btnLevelsClose: $('btn-levels-close'),
      result: $('screen-result'),
      resultBadge: $('result-badge'),
      resultStars: $('result-stars'),
      resultScore: $('result-score'),
      resultExtra: $('result-extra'),
      btnRetry: $('btn-retry'),
      btnNext: $('btn-next'),
      btnResultLevels: $('btn-result-levels'),
      submitArea: $('submit-area'),
      nameInput: $('name-input'),
      btnSubmit: $('btn-submit'),
      submitHint: $('submit-hint'),
      leaderboard: $('leaderboard'),
      lbList: $('lb-list'),
      btnLbClose: $('btn-lb-close'),
      toast: $('toast')
    };

    const e = this.els;
    e.btnStart.addEventListener('click', () => { Sound.click(); game.startFromStartScreen(); });
    e.btnLevelsOpen.addEventListener('click', () => { Sound.click(); this.showLevels(); });
    e.btnLbOpen.addEventListener('click', () => { Sound.click(); this.showLeaderboard(); });
    e.btnLevelsClose.addEventListener('click', () => { Sound.click(); this.hideLevels(); });
    e.btnMenu.addEventListener('click', () => { Sound.click(); this.showLevels(); });
    e.btnSound.addEventListener('click', () => {
      Sound.enabled = !Sound.enabled;
      e.btnSound.textContent = Sound.enabled ? '♪' : '✕';
      e.btnSound.style.opacity = Sound.enabled ? '1' : '.55';
      if (Sound.enabled) Sound.click();
    });
    e.btnRetry.addEventListener('click', () => { Sound.click(); this.hideResult(); game.restartLevel(); });
    e.btnNext.addEventListener('click', () => { Sound.click(); this.hideResult(); game.nextLevel(); });
    e.btnResultLevels.addEventListener('click', () => { Sound.click(); this.hideResult(); this.showLevels(); });
    e.btnLbClose.addEventListener('click', () => { Sound.click(); e.leaderboard.classList.add('hidden'); });
    e.btnSubmit.addEventListener('click', () => this.submitScore());
    e.nameInput.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') this.submitScore(); });

    this.nameInputValue = '';
    try { this.nameInputValue = localStorage.getItem('ab_name') || ''; } catch (err) { /* ignore */ }
    e.nameInput.value = this.nameInputValue;

    this.renderLevelGrid();
  },

  showStart() {
    this.els.start.classList.remove('hidden');
    this.els.hud.classList.add('hidden');
    this.els.result.classList.add('hidden');
    this.els.levels.classList.add('hidden');
  },

  hideStart() {
    this.els.start.classList.add('hidden');
    this.els.hud.classList.remove('hidden');
  },

  updateHud(state) {
    const e = this.els;
    e.levelName.textContent = state.levelSub;
    e.levelSub.textContent = state.levelName;
    e.score.textContent = state.score;

    let html = '';
    const chips = [];
    if (state.bird) chips.push({ type: state.bird.game.type, current: true });
    for (const t of state.queue) chips.push({ type: t, current: false });
    for (const c of chips) {
      html += `<i class="bird-dot ${c.type}${c.current ? ' current' : ''}"></i>`;
    }
    e.birdsLeft.innerHTML = html || '<i class="bird-dot spent"></i>';
  },

  showTip(text) {
    this.els.tip.textContent = text;
    this.els.tip.classList.add('show');
  },

  hideTip() {
    this.els.tip.classList.remove('show');
  },

  toast(msg) {
    const t = this.els.toast;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
  },

  renderLevelGrid() {
    const grid = this.els.levelGrid;
    grid.innerHTML = '';
    LEVELS.forEach((lv, i) => {
      const p = this.game.progress[lv.id] || { stars: 0, best: 0 };
      const stars = [0, 1, 2].map(n => `<span class="${n < p.stars ? '' : 'off'}">★</span>`).join('');
      const card = document.createElement('button');
      card.className = 'level-card';
      card.innerHTML = `
        <div class="no">${lv.id}</div>
        <span class="nm">${lv.name}</span>
        <div class="mini-stars">${stars}</div>
        <span class="best">${p.best ? '最高 ' + p.best : '尚未通关'}</span>`;
      card.addEventListener('click', () => {
        Sound.click();
        this.hideLevels();
        this.game.startLevel(i);
      });
      grid.appendChild(card);
    });
  },

  showLevels() {
    this.renderLevelGrid();
    this.els.levels.classList.remove('hidden');
  },

  hideLevels() {
    this.els.levels.classList.add('hidden');
  },

  showResult({ win, score, stars, extra, levelIndex }) {
    const e = this.els;
    e.result.classList.remove('hidden');
    e.resultBadge.textContent = win ? '关卡完成' : '挑战失败';
    e.resultBadge.className = 'result-badge' + (win ? '' : ' lose');
    e.resultStars.innerHTML = [0, 1, 2].map(n =>
      `<span class="star ${win && n < stars ? '' : 'off'}">★</span>`).join('');
    e.resultScore.textContent = score;
    e.resultExtra.textContent = extra || '';
    e.submitArea.classList.toggle('hidden', !win);
    e.submitHint.textContent = '';
    e.btnSubmit.disabled = false;
    e.btnSubmit.textContent = '提交到排行榜';
    const isLast = levelIndex >= LEVELS.length - 1;
    e.btnNext.textContent = isLast ? '回到第一关' : '下一关';
    e.btnNext.classList.toggle('hidden', !win);
    this._lastResult = { win, score, levelIndex, submitted: false };
  },

  hideResult() {
    this.els.result.classList.add('hidden');
  },

  submitScore() {
    const name = (this.els.nameInput.value || '').trim() || '无名小鸟';
    try { localStorage.setItem('ab_name', name); } catch (err) { /* ignore */ }
    const r = this._lastResult;
    if (!r) return;
    this.els.btnSubmit.disabled = true;
    this.els.btnSubmit.textContent = '提交中…';
    fetch('/api/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, score: r.score, level: LEVELS[r.levelIndex].id })
    })
      .then(res => res.json())
      .then(list => {
        r.submitted = true;
        this.els.submitHint.textContent = `已提交！当前排行榜第 ${Math.max(1, this.rankOf(list, r.score))} 名`;
        this.els.btnSubmit.textContent = '已提交';
        this.renderLeaderboard(list);
      })
      .catch(() => {
        this.els.btnSubmit.disabled = false;
        this.els.btnSubmit.textContent = '重新提交';
        this.els.submitHint.textContent = '提交失败，请检查网络后重试';
      });
  },

  rankOf(list, score) {
    if (!Array.isArray(list)) return 1;
    const idx = list.findIndex(item => item.score <= score);
    return idx === -1 ? list.length + 1 : idx + 1;
  },

  showLeaderboard() {
    const lb = this.els.leaderboard;
    lb.classList.remove('hidden');
    this.els.lbList.innerHTML = '<li class="empty">加载中…</li>';
    fetch('/api/leaderboard')
      .then(res => res.json())
      .then(list => this.renderLeaderboard(list))
      .catch(() => {
        this.els.lbList.innerHTML = '<li class="empty">排行榜暂时无法连接</li>';
      });
  },

  renderLeaderboard(list) {
    const ol = this.els.lbList;
    if (!Array.isArray(list) || !list.length) {
      ol.innerHTML = '<li class="empty">还没有成绩，快来抢第一名</li>';
      return;
    }
    ol.innerHTML = list.map((item, i) =>
      `<li><span>${i + 1}. ${this.escape(item.name)}</span><b>${item.score}</b></li>`).join('');
  },

  escape(str) {
    return String(str).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c]);
  }
};
