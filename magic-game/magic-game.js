/*!
 * Magic Quarter-View Mini Game
 * - 2D 쿼터뷰(아이소메트릭) 마법학교 미니 게임
 * - 외부 이미지 없이 Canvas 도형만으로 렌더링
 *
 * 사용법:
 *   <div data-magic-game></div>
 *   <script src="magic-game.js"></script>
 * 또는
 *   const game = MagicQuarterGame.mount(document.getElementById('game'));
 *   game.destroy(); // 제거
 *
 * 조작: WASD/방향키 이동 · Space 빗자루 탑승/착지 · F 마법 발사
 */
(function (global) {
  'use strict';

  // ---------------------------------------------------------------------------
  // 상수
  // ---------------------------------------------------------------------------
  const TW = 64, TH = 32;           // 타일 크기(마름모)
  const HW = TW / 2, HH = TH / 2;
  const MAP_W = 40, MAP_H = 40;
  const FLY_Z = 78;                 // 비행 고도(px). 이보다 낮은 장애물은 넘어갈 수 있음
  const WALK_SPEED = 3.2;           // 타일/초
  const FLY_SPEED = 6.4;
  const PLAYER_R = 0.28;
  const FIRE_COOLDOWN = 0.22;
  const BOLT_SPEED = 10;
  const BOLT_LIFE = 1.1;

  const G = { GRASS: 0, PATH: 1, WATER: 2, STONE: 3, PITCH: 4, FLOWER: 5, SOIL: 6 };

  // 장애물 정의: h = 높이(px). 비행 중에는 h < FLY_Z 인 것만 넘을 수 있음
  const OBJ = {
    tree:  { h: 64 },
    pine:  { h: 72 },
    rock:  { h: 14 },
    bush:  { h: 16 },
    fence: { h: 20 },
    lamp:  { h: 46, thin: true },
    hut:   { h: 60 },
    wall:  { h: 96 },
    tower: { h: 170 },
    hoop:  { h: 130, flyThrough: true, thin: true },
  };

  const SKIN = '#f5c6a5';
  const HAIR = '#e8781a', HAIR_D = '#b85810';
  const ROBE = '#151515', ROBE_L = '#2a2a2a';
  const HAT = '#2f3e7a', HAT_D = '#232f5e', HAT_BAND = '#d8a83a';

  // ---------------------------------------------------------------------------
  // 유틸
  // ---------------------------------------------------------------------------
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  // ---------------------------------------------------------------------------
  // 맵 생성
  // ---------------------------------------------------------------------------
  function generateMap() {
    const rng = mulberry32(20261012);
    const n = MAP_W * MAP_H;
    const ground = new Uint8Array(n);
    const shade = new Float32Array(n);
    const obj = new Array(n).fill(null);
    const reserved = new Uint8Array(n);
    const idx = (x, y) => y * MAP_W + x;
    const inMap = (x, y) => x >= 0 && y >= 0 && x < MAP_W && y < MAP_H;
    const put = (x, y, type, extra) => {
      if (!inMap(x, y)) return;
      obj[idx(x, y)] = Object.assign({ type, def: OBJ[type], v: rng() }, extra || {});
      reserved[idx(x, y)] = 1;
    };
    const setG = (x, y, g) => { if (inMap(x, y)) ground[idx(x, y)] = g; };
    const reserve = (x0, y0, x1, y1) => {
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (inMap(x, y)) reserved[idx(x, y)] = 1;
    };

    for (let i = 0; i < n; i++) shade[i] = rng();

    // 호수
    for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
      const dx = (x + 0.5 - 26) / 8, dy = (y + 0.5 - 11) / 5.5;
      const wobble = Math.sin(x * 1.3) * 0.08 + Math.cos(y * 1.7) * 0.08;
      if (dx * dx + dy * dy < 1 + wobble) { setG(x, y, G.WATER); reserved[idx(x, y)] = 1; }
    }

    // 길
    const pathRect = (x0, y0, x1, y1) => {
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) setG(x, y, G.PATH);
      reserve(x0 - 1, y0 - 1, x1 + 1, y1 + 1);
    };
    pathRect(9, 13, 10, 21);   // 성문 → 교차로
    pathRect(9, 20, 31, 21);   // 동서 대로
    pathRect(20, 20, 21, 34);  // 남쪽 시작 지점
    pathRect(8, 30, 21, 30);   // 오두막 방향
    pathRect(30, 21, 31, 25);  // 경기장 방향

    // 성 (벽 + 탑) — 비행으로도 넘을 수 없음. 남쪽 성문으로 진입
    const cx0 = 5, cy0 = 3, cx1 = 14, cy1 = 12;
    for (let y = cy0; y <= cy1; y++) for (let x = cx0; x <= cx1; x++) setG(x, y, G.STONE);
    reserve(cx0 - 1, cy0 - 1, cx1 + 1, cy1 + 1);
    for (let x = cx0; x <= cx1; x++) {
      put(x, cy0, 'wall');
      if (x !== 9 && x !== 10) put(x, cy1, 'wall');
    }
    for (let y = cy0; y <= cy1; y++) { put(cx0, y, 'wall'); put(cx1, y, 'wall'); }
    [[cx0, cy0], [cx1, cy0], [cx0, cy1], [cx1, cy1], [8, cy1], [11, cy1], [9, 6], [10, 6], [12, 8]]
      .forEach(([x, y]) => put(x, y, 'tower'));

    // 해그리드풍 오두막 + 호박밭
    put(6, 29, 'hut');
    reserve(4, 27, 8, 31);
    for (let y = 32; y <= 37; y++) for (let x = 9; x <= 15; x++) {
      const edge = x === 9 || x === 15 || y === 32 || y === 37;
      if (edge) { if (!(y === 32 && (x === 12))) put(x, y, 'fence'); }
      else setG(x, y, G.SOIL);
      reserved[idx(x, y)] = 1;
    }
    pathRect(12, 31, 12, 31);

    // 퀴디치 경기장
    for (let y = 24; y <= 34; y++) for (let x = 27; x <= 37; x++) { setG(x, y, G.PITCH); reserved[idx(x, y)] = 1; }
    [[35, 26], [35, 29], [35, 32], [29, 29]].forEach(([x, y]) => put(x, y, 'hoop', { cool: 0 }));

    // 가로등
    [[11, 15], [11, 19], [14, 22], [18, 22], [24, 19], [28, 19], [22, 24], [22, 28], [23, 33], [16, 31]]
      .forEach(([x, y]) => { if (!obj[idx(x, y)] && ground[idx(x, y)] !== G.WATER) put(x, y, 'lamp'); });

    // 시작 지점 주변 비우기
    reserve(18, 30, 23, 36);

    // 자연물
    for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
      const i = idx(x, y);
      if (reserved[i] || ground[i] === G.WATER) continue;
      const border = x < 2 || y < 2 || x > MAP_W - 3 || y > MAP_H - 3;
      const r = rng();
      if (border) { put(x, y, r < 0.7 ? 'pine' : 'tree'); continue; }
      const westForest = x < 5 && y > 14 && y < 26;
      if (r < (westForest ? 0.55 : 0.06)) put(x, y, rng() < 0.5 ? 'pine' : 'tree');
      else if (r < 0.08) put(x, y, 'rock');
      else if (r < 0.11) put(x, y, 'bush');
      else if (r < 0.17) setG(x, y, G.FLOWER);
    }

    return {
      ground, shade, obj,
      idx, inMap,
      groundAt(x, y) { return inMap(x, y) ? ground[idx(x, y)] : -1; },
      objAt(x, y) { return inMap(x, y) ? obj[idx(x, y)] : null; },
    };
  }

  // ---------------------------------------------------------------------------
  // 게임 인스턴스
  // ---------------------------------------------------------------------------
  function mount(container, options) {
    if (!container) throw new Error('MagicQuarterGame: container element is required');
    if (container.__magicGame) return container.__magicGame;
    const opts = Object.assign({ hat: true, autoFocus: false }, options || {});

    injectStyles();
    const wrap = document.createElement('div');
    wrap.className = 'mqg-wrap';
    const canvas = document.createElement('canvas');
    canvas.className = 'mqg-canvas';
    canvas.tabIndex = 0;
    canvas.setAttribute('aria-label', '마법학교 쿼터뷰 미니 게임. 클릭 후 WASD 또는 방향키로 이동, 스페이스바로 빗자루, F로 마법');
    wrap.appendChild(canvas);
    container.appendChild(wrap);
    const ctx = canvas.getContext('2d');

    const map = generateMap();
    const rng = mulberry32(99);

    const state = {
      t: 0,
      focused: false,
      keys: Object.create(null),
      player: {
        x: 20.9, y: 33.5, z: 0,
        fx: -0.7071, fy: -0.7071,  // 바라보는 방향(월드)
        flying: false,
        moving: false,
        walk: 0,
        cast: 0,
        fireCd: 0,
        side: 1,                     // 좌(-1)/우(1) 마지막 방향 (빗자루 방향)
        trail: 0,
      },
      cam: { x: 0, y: 0 },
      bolts: [],
      particles: [],
      pumpkins: [],
      pixies: [],
      toasts: [],
      score: 0,
      stats: { pumpkin: 0, pixie: 0, hoop: 0 },
      smokeT: 0,
      view: { w: 640, h: 360, zoom: 1, dpr: 1 },
    };

    // 호박(과녁) 배치
    for (let i = 0; i < 8; i++) state.pumpkins.push(spawnPumpkin({}));
    // 픽시(움직이는 과녁)
    for (let i = 0; i < 6; i++) state.pixies.push(spawnPixie({}));

    function spawnPumpkin(p) {
      p.x = 10.5 + rng() * 4.0 + 0.0;
      p.y = 33.5 + rng() * 3.0;
      p.alive = true; p.respawn = 0; p.size = 0.8 + rng() * 0.4;
      return p;
    }
    function spawnPixie(p) {
      for (let k = 0; k < 50; k++) {
        const x = 3 + rng() * (MAP_W - 6), y = 3 + rng() * (MAP_H - 6);
        const o = map.objAt(x | 0, y | 0);
        if (!o || o.def.h < FLY_Z) { p.x = x; p.y = y; break; }
      }
      p.z = 26; p.vx = 0; p.vy = 0; p.turn = 0; p.t = rng() * 10;
      p.alive = true; p.respawn = 0;
      p.hue = ['#7fd6ff', '#9dffb0', '#ffb3f0'][(rng() * 3) | 0];
      return p;
    }

    // -------------------------------------------------------------------------
    // 충돌
    // -------------------------------------------------------------------------
    function tileBlocked(tx, ty, flying) {
      if (!map.inMap(tx, ty)) return true;
      const o = map.objAt(tx, ty);
      if (flying) return !!(o && !o.def.flyThrough && o.def.h >= FLY_Z - 4);
      if (o) return true;
      return map.groundAt(tx, ty) === G.WATER;
    }
    function canStand(x, y, flying) {
      const r = PLAYER_R;
      return !tileBlocked(Math.floor(x - r), Math.floor(y - r), flying) &&
             !tileBlocked(Math.floor(x + r), Math.floor(y - r), flying) &&
             !tileBlocked(Math.floor(x - r), Math.floor(y + r), flying) &&
             !tileBlocked(Math.floor(x + r), Math.floor(y + r), flying);
    }

    // -------------------------------------------------------------------------
    // 입력
    // -------------------------------------------------------------------------
    const GAME_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyF']);

    function onKeyDown(e) {
      if (!GAME_KEYS.has(e.code)) return;
      e.preventDefault(); // 게임에 포커스가 있을 때만 페이지 스크롤 방지
      if (e.code === 'Space' && !e.repeat) toggleBroom();
      if (e.code === 'KeyF' && !e.repeat) tryFire();
      state.keys[e.code] = true;
    }
    function onKeyUp(e) {
      if (GAME_KEYS.has(e.code)) { state.keys[e.code] = false; e.preventDefault(); }
    }
    function onFocus() { state.focused = true; }
    function onBlur() { state.focused = false; state.keys = Object.create(null); }
    function onPointerDown() { canvas.focus({ preventScroll: true }); }

    canvas.addEventListener('keydown', onKeyDown);
    canvas.addEventListener('keyup', onKeyUp);
    canvas.addEventListener('focus', onFocus);
    canvas.addEventListener('blur', onBlur);
    canvas.addEventListener('pointerdown', onPointerDown);

    // 터치 컨트롤 (모바일)
    const touchUI = buildTouchControls();
    function buildTouchControls() {
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      if (!isTouch) return null;
      const ui = document.createElement('div');
      ui.className = 'mqg-touch';
      ui.innerHTML =
        '<div class="mqg-pad">' +
        '<button data-k="ArrowUp" class="u">▲</button>' +
        '<button data-k="ArrowLeft" class="l">◀</button>' +
        '<button data-k="ArrowRight" class="r">▶</button>' +
        '<button data-k="ArrowDown" class="d">▼</button>' +
        '</div>' +
        '<div class="mqg-act">' +
        '<button data-a="broom">🧹</button>' +
        '<button data-a="fire" data-k="KeyF">✨</button>' +
        '</div>';
      ui.querySelectorAll('button').forEach((b) => {
        const k = b.getAttribute('data-k'), a = b.getAttribute('data-a');
        const down = (e) => {
          e.preventDefault();
          state.focused = true;
          if (a === 'broom') toggleBroom();
          if (a === 'fire') tryFire();
          if (k) state.keys[k] = true;
        };
        const up = (e) => { e.preventDefault(); if (k) state.keys[k] = false; };
        b.addEventListener('pointerdown', down);
        b.addEventListener('pointerup', up);
        b.addEventListener('pointerleave', up);
        b.addEventListener('pointercancel', up);
      });
      wrap.appendChild(ui);
      return ui;
    }

    // -------------------------------------------------------------------------
    // 액션
    // -------------------------------------------------------------------------
    function toast(text, color) {
      state.toasts.push({ text, color: color || '#fff', t: 0 });
      if (state.toasts.length > 3) state.toasts.shift();
    }

    function toggleBroom() {
      const p = state.player;
      if (!p.flying) {
        p.flying = true;
        burst(p.x, p.y, 4, 14, '#e9dcb5', false, 1.2);
        toast('🧹 빗자루 탑승! 속도 UP · 장애물 통과');
      } else {
        if (!canStand(p.x, p.y, false)) { toast('여기엔 착지할 수 없어요!', '#ffb3b3'); return; }
        p.flying = false;
        toast('착지 완료');
      }
    }

    function tryFire() {
      const p = state.player;
      if (p.fireCd > 0) return;
      p.fireCd = FIRE_COOLDOWN;
      p.cast = 0.2;
      const len = Math.hypot(p.fx, p.fy) || 1;
      const dx = p.fx / len, dy = p.fy / len;
      state.bolts.push({
        x: p.x + dx * 0.45, y: p.y + dy * 0.45, z: p.z + 22,
        vx: dx * BOLT_SPEED, vy: dy * BOLT_SPEED,
        life: BOLT_LIFE,
        color: p.flying ? '#ffd86b' : '#8fe9ff',
      });
      burst(p.x + dx * 0.45, p.y + dy * 0.45, p.z + 22, 6, '#ffffff', true, 1.5);
    }

    function burst(x, y, z, count, color, glow, power) {
      for (let i = 0; i < count; i++) {
        const a = rng() * Math.PI * 2, s = (0.5 + rng()) * (power || 1);
        state.particles.push({
          x, y, z,
          vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: 30 + rng() * 60 * (power || 1),
          life: 0.4 + rng() * 0.5, max: 0.9,
          size: 2 + ((rng() * 2) | 0), color, glow, grav: glow ? 40 : 160,
        });
      }
      if (state.particles.length > 500) state.particles.splice(0, state.particles.length - 500);
    }

    // -------------------------------------------------------------------------
    // 업데이트
    // -------------------------------------------------------------------------
    function update(dt) {
      state.t += dt;
      const p = state.player;
      const k = state.keys;

      // 이동 입력 (화면 기준 → 월드 좌표 변환)
      let ix = 0, iy = 0;
      if (k.KeyW || k.ArrowUp) iy -= 1;
      if (k.KeyS || k.ArrowDown) iy += 1;
      if (k.KeyA || k.ArrowLeft) ix -= 1;
      if (k.KeyD || k.ArrowRight) ix += 1;
      let wx = ix + iy, wy = iy - ix;
      const wl = Math.hypot(wx, wy);
      p.moving = wl > 0;
      if (p.moving) {
        wx /= wl; wy /= wl;
        p.fx = wx; p.fy = wy;
        const sx = wx - wy;
        if (Math.abs(sx) > 0.1) p.side = sx > 0 ? 1 : -1;
        const sp = (p.flying ? FLY_SPEED : WALK_SPEED) * dt;
        const nx = clamp(p.x + wx * sp, 0.3, MAP_W - 0.3);
        if (canStand(nx, p.y, p.flying)) p.x = nx;
        const ny = clamp(p.y + wy * sp, 0.3, MAP_H - 0.3);
        if (canStand(p.x, ny, p.flying)) p.y = ny;
        p.walk += dt * (p.flying ? 6 : 10);
      }

      // 고도
      p.z = lerp(p.z, p.flying ? FLY_Z : 0, 1 - Math.pow(0.002, dt));
      if (!p.flying && p.z < 0.5) p.z = 0;

      // 비행 꼬리 이펙트
      if (p.flying && p.z > 20) {
        p.trail -= dt;
        if (p.trail <= 0) {
          p.trail = p.moving ? 0.03 : 0.12;
          state.particles.push({
            x: p.x - p.fx * 0.35 + (rng() - 0.5) * 0.15, y: p.y - p.fy * 0.35 + (rng() - 0.5) * 0.15, z: p.z + 4,
            vx: 0, vy: 0, vz: -6, life: 0.5, max: 0.5, size: 2, color: p.moving ? '#fff6c9' : '#cfe8ff', glow: true, grav: 0,
          });
        }
      }

      // F 길게 누르면 연사
      if (k.KeyF) tryFire();
      p.fireCd = Math.max(0, p.fireCd - dt);
      p.cast = Math.max(0, p.cast - dt);

      // 퀴디치 골대 통과
      const ho = map.objAt(Math.floor(p.x), Math.floor(p.y));
      if (ho && ho.type === 'hoop' && p.flying && p.z > FLY_Z - 15 && ho.cool <= 0) {
        ho.cool = 2;
        state.score += 5; state.stats.hoop++;
        burst(p.x, p.y, p.z + 20, 30, '#ffd86b', true, 2);
        toast('🏅 골인! +5', '#ffd86b');
      }
      map.obj.forEach((o) => { if (o && o.type === 'hoop' && o.cool > 0) o.cool -= dt; });

      // 마법 탄환
      for (let i = state.bolts.length - 1; i >= 0; i--) {
        const b = state.bolts[i];
        b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
        // 꼬리
        state.particles.push({
          x: b.x, y: b.y, z: b.z + (rng() - 0.5) * 4, vx: (rng() - 0.5) * 0.4, vy: (rng() - 0.5) * 0.4, vz: (rng() - 0.5) * 10,
          life: 0.3, max: 0.3, size: 2, color: b.color, glow: true, grav: 0,
        });
        let dead = b.life <= 0;
        const tx = Math.floor(b.x), ty = Math.floor(b.y);
        if (!map.inMap(tx, ty)) dead = true;
        else {
          const o = map.objAt(tx, ty);
          if (o && !o.def.thin && o.def.h > b.z) { dead = true; }
        }
        if (!dead) {
          for (const pk of state.pumpkins) {
            if (pk.alive && (pk.x - b.x) ** 2 + (pk.y - b.y) ** 2 < 0.45 * 0.45) {
              pk.alive = false; pk.respawn = 4;
              state.score += 1; state.stats.pumpkin++;
              burst(pk.x, pk.y, 8, 24, '#ff8c1a', false, 1.6);
              burst(pk.x, pk.y, 8, 10, '#ffe08a', true, 1.2);
              toast('🎃 +1', '#ffb066');
              dead = true; break;
            }
          }
        }
        if (!dead) {
          for (const px of state.pixies) {
            if (px.alive && (px.x - b.x) ** 2 + (px.y - b.y) ** 2 < 0.5 * 0.5) {
              px.alive = false; px.respawn = 5;
              state.score += 3; state.stats.pixie++;
              burst(px.x, px.y, px.z, 24, px.hue, true, 1.8);
              toast('🧚 픽시 포획! +3', px.hue);
              dead = true; break;
            }
          }
        }
        if (dead) {
          burst(b.x, b.y, b.z, 12, b.color, true, 1.2);
          state.bolts.splice(i, 1);
        }
      }

      // 호박 리스폰
      for (const pk of state.pumpkins) {
        if (!pk.alive && (pk.respawn -= dt) <= 0) spawnPumpkin(pk);
      }

      // 픽시 이동
      for (const px of state.pixies) {
        if (!px.alive) { if ((px.respawn -= dt) <= 0) spawnPixie(px); continue; }
        px.t += dt; px.turn -= dt;
        if (px.turn <= 0) {
          const a = rng() * Math.PI * 2;
          px.vx = Math.cos(a) * 1.4; px.vy = Math.sin(a) * 1.4; px.turn = 1 + rng() * 2;
        }
        // 플레이어 근처면 도망
        const dx = px.x - p.x, dy = px.y - p.y, d = Math.hypot(dx, dy);
        if (d < 2.5 && d > 0.01) { px.vx = dx / d * 2.4; px.vy = dy / d * 2.4; }
        const nx = px.x + px.vx * dt, ny = px.y + px.vy * dt;
        if (!tileBlocked(Math.floor(nx), Math.floor(ny), true) && nx > 2 && ny > 2 && nx < MAP_W - 2 && ny < MAP_H - 2) {
          px.x = nx; px.y = ny;
        } else { px.turn = 0; }
        px.z = 26 + Math.sin(px.t * 3) * 6;
      }

      // 오두막 굴뚝 연기
      state.smokeT -= dt;
      if (state.smokeT <= 0) {
        state.smokeT = 0.25;
        state.particles.push({
          x: 6.62, y: 29.2, z: 72, vx: 0.15 + rng() * 0.1, vy: -0.1, vz: 18,
          life: 2.2, max: 2.2, size: 4, color: '#c9c4bd', glow: false, grav: -2, smoke: true,
        });
      }

      // 파티클
      for (let i = state.particles.length - 1; i >= 0; i--) {
        const q = state.particles[i];
        q.life -= dt;
        if (q.life <= 0) { state.particles.splice(i, 1); continue; }
        q.x += q.vx * dt; q.y += q.vy * dt;
        q.vz -= q.grav * dt; q.z += q.vz * dt;
        if (q.z < 0) { q.z = 0; q.vz *= -0.3; q.vx *= 0.6; q.vy *= 0.6; }
      }

      // 토스트
      for (let i = state.toasts.length - 1; i >= 0; i--) {
        state.toasts[i].t += dt;
        if (state.toasts[i].t > 1.8) state.toasts.splice(i, 1);
      }

      // 카메라
      const tx = (p.x - p.y) * HW, ty = (p.x + p.y) * HH - p.z * 0.5 - 20;
      const f = 1 - Math.pow(0.0005, dt);
      state.cam.x = lerp(state.cam.x, tx, f);
      state.cam.y = lerp(state.cam.y, ty, f);
    }

    // -------------------------------------------------------------------------
    // 렌더링 헬퍼
    // -------------------------------------------------------------------------
    function toScreen(wx, wy, z) {
      const v = state.view;
      return {
        x: Math.round((wx - wy) * HW - state.cam.x + v.w / 2),
        y: Math.round((wx + wy) * HH - (z || 0) - state.cam.y + v.h / 2),
      };
    }

    function diamond(cx, cy, hw, hh) {
      ctx.beginPath();
      ctx.moveTo(cx, cy - hh); ctx.lineTo(cx + hw, cy); ctx.lineTo(cx, cy + hh); ctx.lineTo(cx - hw, cy);
      ctx.closePath();
    }

    // 아이소메트릭 박스 (cx, cy = 바닥 중심 화면좌표)
    function isoBox(cx, cy, hw, hh, z0, h, top, left, right) {
      const by = cy - z0, ty = cy - z0 - h;
      ctx.fillStyle = left;
      ctx.beginPath();
      ctx.moveTo(cx - hw, ty); ctx.lineTo(cx, ty + hh); ctx.lineTo(cx, by + hh); ctx.lineTo(cx - hw, by);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = right;
      ctx.beginPath();
      ctx.moveTo(cx, ty + hh); ctx.lineTo(cx + hw, ty); ctx.lineTo(cx + hw, by); ctx.lineTo(cx, by + hh);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = top;
      diamond(cx, ty, hw, hh); ctx.fill();
    }

    // 피라미드 지붕 / 첨탑
    function pyramid(cx, cy, hw, hh, z0, rh, back, left, right) {
      const by = cy - z0, ay = by - rh;
      ctx.fillStyle = back;
      ctx.beginPath(); ctx.moveTo(cx - hw, by); ctx.lineTo(cx, by - hh); ctx.lineTo(cx + hw, by); ctx.lineTo(cx, ay); ctx.closePath(); ctx.fill();
      ctx.fillStyle = left;
      ctx.beginPath(); ctx.moveTo(cx - hw, by); ctx.lineTo(cx, by + hh); ctx.lineTo(cx, ay); ctx.closePath(); ctx.fill();
      ctx.fillStyle = right;
      ctx.beginPath(); ctx.moveTo(cx, by + hh); ctx.lineTo(cx + hw, by); ctx.lineTo(cx, ay); ctx.closePath(); ctx.fill();
    }

    function shadow(x, y, rx, alpha) {
      const s = toScreen(x, y, 0);
      ctx.fillStyle = 'rgba(0,0,0,' + alpha + ')';
      ctx.beginPath(); ctx.ellipse(s.x, s.y, rx, rx * 0.5, 0, 0, Math.PI * 2); ctx.fill();
    }

    function glow(x, y, r, color, alpha) {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, color);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = alpha;
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }

    // -------------------------------------------------------------------------
    // 지형
    // -------------------------------------------------------------------------
    const GRASS_COLORS = ['#6f9b45', '#76a34b', '#6a9441', '#7aa84f'];

    function drawGroundTile(tx, ty) {
      const i = map.idx(tx, ty);
      const g = map.ground[i], sh = map.shade[i];
      const c = toScreen(tx + 0.5, ty + 0.5, 0);
      const chk = (tx + ty) & 1;
      let col;
      switch (g) {
        case G.PATH: col = chk ? '#b8a06f' : '#ae9564'; break;
        case G.STONE: col = chk ? '#a29c8f' : '#979185'; break;
        case G.PITCH: col = (tx & 1) ? '#86b955' : '#7caf4c'; break;
        case G.SOIL: col = chk ? '#6e4f33' : '#654830'; break;
        case G.WATER: col = '#55794a'; break; // 물가(둑)
        default: col = GRASS_COLORS[(sh * 4) | 0]; if (chk) col = shadeColor(col, -6);
      }
      ctx.fillStyle = col;
      diamond(c.x, c.y, HW + 0.5, HH + 0.5); ctx.fill();

      if (g === G.WATER) {
        const wave = Math.sin(state.t * 1.5 + tx * 0.8 + ty * 0.6);
        ctx.fillStyle = wave > 0.6 ? '#4f86b8' : '#457bab';
        diamond(c.x, c.y + 3, HW + 0.5, HH + 0.5); ctx.fill();
        const s = Math.sin(state.t * 2 + tx * 1.7 + ty * 2.3);
        if (s > 0.3) {
          ctx.fillStyle = 'rgba(220,240,255,' + (0.25 + s * 0.25).toFixed(2) + ')';
          ctx.fillRect(c.x - 8 + (sh * 12 | 0), c.y + 2 + ((sh * 7) | 0) - 3, 8, 2);
        }
      } else if (g === G.FLOWER) {
        const fc = ['#ffe36b', '#ff9ec7', '#ffffff', '#b9a0ff'][(sh * 4) | 0];
        ctx.fillStyle = fc;
        for (let k = 0; k < 4; k++) {
          const ox = (((sh * 97 + k * 31) % 1) * 36 - 18) | 0;
          const oy = (((sh * 53 + k * 17) % 1) * 14 - 7) | 0;
          ctx.fillRect(c.x + ox, c.y + oy, 3, 3);
        }
      } else if (g === G.SOIL) {
        ctx.fillStyle = 'rgba(0,0,0,0.12)';
        ctx.fillRect(c.x - 14, c.y - 2, 28, 2);
        ctx.fillRect(c.x - 10, c.y + 4, 20, 2);
      } else if (g === G.GRASS && sh > 0.7) {
        ctx.fillStyle = 'rgba(40,80,20,0.35)';
        ctx.fillRect(c.x - 6, c.y - 3, 2, 4); ctx.fillRect(c.x + 5, c.y + 2, 2, 4);
      }
    }

    function shadeColor(hex, amt) {
      const n = parseInt(hex.slice(1), 16);
      const r = clamp((n >> 16) + amt, 0, 255), g = clamp(((n >> 8) & 255) + amt, 0, 255), b = clamp((n & 255) + amt, 0, 255);
      return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
    }

    // -------------------------------------------------------------------------
    // 오브젝트
    // -------------------------------------------------------------------------
    function drawObject(o, tx, ty) {
      const c = toScreen(tx + 0.5, ty + 0.5, 0);
      const x = c.x, y = c.y;
      switch (o.type) {
        case 'tree': {
          const g = o.v > 0.5 ? ['#5f9a3a', '#4c8030', '#3f6d27'] : ['#6aa843', '#558f36', '#467a2c'];
          ctx.fillStyle = 'rgba(0,0,0,0.18)'; diamond(x, y, 20, 10); ctx.fill();
          isoBox(x, y, 5, 2.5, 0, 18, '#8a5a32', '#7a4d2a', '#5e3a1f');
          isoBox(x, y, 20, 10, 14, 20, g[0], g[1], g[2]);
          isoBox(x, y, 13, 6.5, 34, 16, shadeColor(g[0], 10), g[1], g[2]);
          isoBox(x, y, 6, 3, 50, 10, shadeColor(g[0], 20), g[1], g[2]);
          break;
        }
        case 'pine': {
          ctx.fillStyle = 'rgba(0,0,0,0.18)'; diamond(x, y, 18, 9); ctx.fill();
          isoBox(x, y, 4, 2, 0, 14, '#7a4d2a', '#6b4222', '#4f3018');
          isoBox(x, y, 18, 9, 10, 18, '#3f7a3f', '#336633', '#285228');
          isoBox(x, y, 13, 6.5, 28, 18, '#46854a', '#376b39', '#2b552d');
          isoBox(x, y, 8, 4, 46, 16, '#4e9152', '#3d7440', '#2f5b31');
          isoBox(x, y, 3, 1.5, 62, 10, '#58a05c', '#447e47', '#335f36');
          break;
        }
        case 'rock':
          isoBox(x - 3, y + 2, 12, 6, 0, 11, '#b3b3ad', '#949490', '#7a7a76');
          isoBox(x + 9, y - 2, 6, 3, 0, 7, '#a7a7a1', '#8a8a86', '#71716d');
          break;
        case 'bush':
          isoBox(x, y, 15, 7.5, 0, 14, '#5c9a3e', '#4a8231', '#3a6a26');
          ctx.fillStyle = '#d8394a';
          ctx.fillRect(x - 6, y - 12, 3, 3); ctx.fillRect(x + 4, y - 9, 3, 3); ctx.fillRect(x - 1, y - 16, 3, 3);
          break;
        case 'fence': {
          // 이웃 울타리 쪽으로 난간을 이어 그림
          const isFence = (ax, ay) => { const n = map.objAt(ax, ay); return n && n.type === 'fence'; };
          const rail = (dx, dy) => {
            const e = toScreen(tx + 0.5 + dx * 0.5, ty + 0.5 + dy * 0.5, 0);
            ctx.strokeStyle = '#9a6f45'; ctx.lineWidth = 3;
            for (const hz of [8, 15]) {
              ctx.beginPath(); ctx.moveTo(x, y - hz); ctx.lineTo(e.x, e.y - hz); ctx.stroke();
            }
          };
          if (isFence(tx - 1, ty)) rail(-1, 0);
          if (isFence(tx, ty - 1)) rail(0, -1);
          if (isFence(tx + 1, ty)) rail(1, 0);
          if (isFence(tx, ty + 1)) rail(0, 1);
          isoBox(x, y, 3, 1.5, 0, 20, '#b8875a', '#8d6239', '#6e4b2a');
          break;
        }
        case 'lamp': {
          isoBox(x, y, 4, 2, 0, 4, '#3a3a3a', '#2c2c2c', '#202020');
          isoBox(x, y, 1.5, 0.75, 4, 36, '#3a3a3a', '#2c2c2c', '#202020');
          const flick = 0.85 + Math.sin(state.t * 9 + tx) * 0.05;
          isoBox(x, y, 5, 2.5, 40, 8, '#2c2c2c', '#ffd27a', '#f0b850');
          ctx.globalCompositeOperation = 'lighter';
          glow(x, y - 44, 26, 'rgba(255,200,110,0.9)', 0.55 * flick);
          ctx.globalCompositeOperation = 'source-over';
          break;
        }
        case 'hut': {
          ctx.fillStyle = 'rgba(0,0,0,0.2)'; diamond(x, y + 2, 30, 15); ctx.fill();
          isoBox(x, y, 26, 13, 0, 30, '#9b8a73', '#8a6f52', '#6d563f');
          // 문/창문
          ctx.fillStyle = '#4a2f1a';
          ctx.beginPath(); ctx.moveTo(x - 16, y - 4); ctx.lineTo(x - 8, y); ctx.lineTo(x - 8, y - 18); ctx.lineTo(x - 16, y - 22); ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#ffd27a';
          ctx.beginPath(); ctx.moveTo(x + 8, y - 12); ctx.lineTo(x + 16, y - 16); ctx.lineTo(x + 16, y - 24); ctx.lineTo(x + 8, y - 20); ctx.closePath(); ctx.fill();
          // 굴뚝
          isoBox(x + 10, y - 6, 4, 2, 30, 34, '#8c8c86', '#77776f', '#5e5e58');
          pyramid(x, y, 32, 16, 30, 32, '#4f3a29', '#6e4e33', '#55392a');
          ctx.globalCompositeOperation = 'lighter';
          glow(x + 12, y - 18, 18, 'rgba(255,190,90,0.8)', 0.45);
          ctx.globalCompositeOperation = 'source-over';
          break;
        }
        case 'wall': {
          isoBox(x, y, HW, HH, 0, 92, '#cdb78c', '#ac976f', '#8e7b58');
          // 돌 줄눈
          ctx.fillStyle = 'rgba(0,0,0,0.12)';
          for (let k = 1; k < 6; k++) {
            ctx.fillRect(x - HW + 2, y - k * 15 + 2, HW - 4, 1);
            ctx.fillRect(x + 2, y - k * 15 + 2, HW - 4, 1);
          }
          // 흉벽
          isoBox(x - 14, y - 7, 6, 3, 92, 8, '#d6c197', '#b39f77', '#93805e');
          isoBox(x + 14, y + 7, 6, 3, 92, 8, '#d6c197', '#b39f77', '#93805e');
          isoBox(x + 14, y - 7, 6, 3, 92, 8, '#d6c197', '#b39f77', '#93805e');
          isoBox(x - 14, y + 7, 6, 3, 92, 8, '#d6c197', '#b39f77', '#93805e');
          break;
        }
        case 'tower': {
          ctx.fillStyle = 'rgba(0,0,0,0.22)'; diamond(x, y + 4, 34, 17); ctx.fill();
          isoBox(x, y, 26, 13, 0, 140, '#d2bd92', '#b19c74', '#917e5b');
          // 창문 (불빛)
          const lit = 0.75 + Math.sin(state.t * 2 + tx * 3 + ty) * 0.1;
          for (let k = 0; k < 3; k++) {
            const wy = y - 40 - k * 34;
            ctx.fillStyle = '#ffcf6e';
            ctx.fillRect(x - 15, wy, 4, 8);
            ctx.fillRect(x + 10, wy - 2, 4, 8);
            ctx.globalCompositeOperation = 'lighter';
            glow(x - 13, wy + 4, 12, 'rgba(255,190,90,0.9)', 0.35 * lit);
            ctx.globalCompositeOperation = 'source-over';
          }
          isoBox(x, y, 30, 15, 140, 6, '#c2ad84', '#a08b65', '#82704f');
          pyramid(x, y, 30, 15, 146, 74, '#3d4a59', '#56677a', '#424f5f');
          // 깃발
          ctx.fillStyle = '#5a3b1f'; ctx.fillRect(x, y - 236, 2, 18);
          ctx.fillStyle = o.v > 0.5 ? '#b3262e' : '#d8a83a';
          const wv = Math.sin(state.t * 4 + tx) * 2;
          ctx.beginPath(); ctx.moveTo(x + 2, y - 236); ctx.lineTo(x + 14, y - 232 + wv); ctx.lineTo(x + 2, y - 228); ctx.closePath(); ctx.fill();
          break;
        }
        case 'hoop': {
          ctx.fillStyle = 'rgba(0,0,0,0.2)'; diamond(x, y, 8, 4); ctx.fill();
          const top = FLY_Z + 22;
          isoBox(x, y, 2, 1, 0, top - 16, '#e2b94c', '#c99e35', '#a57f25');
          ctx.strokeStyle = o.cool > 0 ? '#fff3b0' : '#f1c94f';
          ctx.lineWidth = 3;
          ctx.beginPath(); ctx.ellipse(x, y - top, 10, 16, 0, 0, Math.PI * 2); ctx.stroke();
          if (o.cool > 0) {
            ctx.globalCompositeOperation = 'lighter';
            glow(x, y - top, 28, 'rgba(255,220,120,1)', o.cool / 2 * 0.8);
            ctx.globalCompositeOperation = 'source-over';
          }
          break;
        }
      }
    }

    function drawPumpkin(pk) {
      const s = toScreen(pk.x, pk.y, 0);
      const w = 10 * pk.size, h = 7 * pk.size;
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath(); ctx.ellipse(s.x, s.y + 1, w + 2, (w + 2) * 0.45, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e8781a';
      ctx.beginPath(); ctx.ellipse(s.x, s.y - h, w, h, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#c95f0c';
      ctx.beginPath(); ctx.ellipse(s.x, s.y - h, w * 0.4, h, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ff9a3c';
      ctx.fillRect(s.x - w * 0.7, s.y - h * 1.5, 3, 3);
      ctx.fillStyle = '#4c7a2c';
      ctx.fillRect(s.x - 1, s.y - h * 2 - 4, 3, 5);
    }

    function drawPixie(px) {
      const s = toScreen(px.x, px.y, px.z);
      ctx.globalCompositeOperation = 'lighter';
      glow(s.x, s.y, 14, px.hue, 0.6);
      ctx.globalCompositeOperation = 'source-over';
      const flap = Math.abs(Math.sin(px.t * 20)) * 5;
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.beginPath(); ctx.ellipse(s.x - 5, s.y - 3, 5, 2 + flap * 0.5, -0.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(s.x + 5, s.y - 3, 5, 2 + flap * 0.5, 0.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = px.hue;
      ctx.fillRect(s.x - 2, s.y - 4, 5, 7);
      ctx.fillStyle = '#20304a';
      ctx.fillRect(s.x - 1, s.y - 2, 1, 1); ctx.fillRect(s.x + 1, s.y - 2, 1, 1);
    }

    function drawBolt(b) {
      const s = toScreen(b.x, b.y, b.z);
      ctx.globalCompositeOperation = 'lighter';
      glow(s.x, s.y, 16, b.color, 0.9);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(s.x - 2, s.y - 2, 4, 4);
    }

    function drawParticle(q) {
      const s = toScreen(q.x, q.y, q.z);
      const a = clamp(q.life / q.max, 0, 1);
      if (q.glow) ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = q.smoke ? a * 0.45 : a;
      ctx.fillStyle = q.color;
      const sz = q.smoke ? q.size + (1 - a) * 8 : q.size;
      ctx.fillRect(s.x - sz / 2, s.y - sz / 2, sz, sz);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    // -------------------------------------------------------------------------
    // 캐릭터 (도트 스타일)
    // -------------------------------------------------------------------------
    function drawPlayer() {
      const p = state.player;
      const bob = p.flying ? Math.sin(state.t * 4) * 2 : 0;
      const s = toScreen(p.x, p.y, p.z);
      const ox = s.x, oy = s.y + Math.round(bob);

      // 바라보는 방향 (화면 기준)
      const fsx = p.fx - p.fy, fsy = (p.fx + p.fy) * 0.5;
      let facing;
      if (Math.abs(fsx) > Math.abs(fsy) * 1.2) facing = 'side';
      else facing = fsy > 0 ? 'down' : 'up';
      const flip = facing === 'side' ? fsx < 0 : p.side < 0;

      const R = (x, y, w, h, col) => {
        ctx.fillStyle = col;
        ctx.fillRect(flip ? ox - x - w : ox + x, oy + y, w, h);
      };

      const step = p.moving && !p.flying ? Math.sin(p.walk) : 0;
      const l1 = Math.max(0, step) * 2 | 0, l2 = Math.max(0, -step) * 2 | 0;

      // 빗자루 (몸 뒤쪽 부분)
      if (p.flying) {
        R(-22, -10, 8, 9, '#d9b25a');
        R(-22, -10, 8, 1, '#b8913f');
        R(-21, -7, 6, 1, '#b8913f');
        R(-21, -4, 6, 1, '#b8913f');
        R(-14, -8, 3, 5, '#8b5a2b');
      }

      // 다리
      if (!p.flying) {
        if (facing === 'side') {
          R(-3, -7 - l1, 3, 7, '#2a2a2a'); R(0, -7 - l2, 3, 7, '#333');
          R(-3, -2 - l1, 4, 2, '#111'); R(0, -2 - l2, 5, 2, '#111');
        } else {
          R(-4, -7 - l1, 3, 7, '#2a2a2a'); R(1, -7 - l2, 3, 7, '#2a2a2a');
          R(-5, -2 - l1, 4, 2, '#111'); R(1, -2 - l2, 4, 2, '#111');
        }
      }

      // 로브
      const robeBottom = p.flying ? -6 : -6;
      R(-7, -22, 14, 22 + robeBottom, ROBE);
      R(-8, robeBottom - 5, 16, 5, ROBE);
      R(4, -22, 3, 16, ROBE_L);

      if (facing === 'down') {
        R(-2, -22, 4, 10, '#bdbdbd');
        R(-2, -23, 4, 2, '#ffffff');
        R(-1, -22, 2, 5, '#d06a10');
        R(3, -19, 2, 2, '#ff8c1a');
      } else if (facing === 'side') {
        R(2, -22, 3, 9, '#bdbdbd');
        R(3, -22, 1, 4, '#d06a10');
      }

      // 비행 시 다리 (빗자루에 걸터앉음)
      if (p.flying) {
        R(-2, -8, 7, 3, '#2a2a2a');
        R(4, -8, 3, 5, '#2a2a2a');
        R(4, -3, 4, 2, '#111');
      }

      // 빗자루 막대 (몸 앞)
      if (p.flying) {
        R(-14, -6, 30, 2, '#8b5a2b');
        R(-14, -6, 30, 1, '#a8713a');
      }

      // 팔
      if (facing === 'side') {
        if (p.cast > 0) {
          R(0, -21, 10, 3, ROBE);
          R(10, -21, 2, 3, SKIN);
          R(12, -22, 6, 1, '#6b4422');
        } else {
          R(-1, -21, 3, 11, ROBE_L);
          R(-1, -10, 3, 2, SKIN);
        }
      } else {
        R(-9, -21, 3, 11, ROBE);
        if (p.cast > 0) {
          R(6, -25, 3, 6, ROBE);
          R(6, -27, 3, 2, SKIN);
          R(7, -32, 1, 5, '#6b4422');
        } else {
          R(6, -21, 3, 11, ROBE);
          R(6, -10, 3, 2, SKIN);
        }
        R(-9, -10, 3, 2, SKIN);
      }

      // 목 + 머리
      R(-2, -24, 4, 2, SKIN);
      if (facing === 'up') {
        R(-5, -33, 10, 9, SKIN);
        R(-6, -35, 12, 10, HAIR);
        R(-6, -27, 12, 2, HAIR_D);
        R(-5, -25, 3, 3, HAIR); R(2, -25, 3, 3, HAIR);
      } else if (facing === 'side') {
        R(-4, -33, 9, 9, SKIN);
        R(-5, -35, 10, 4, HAIR);
        R(-6, -33, 5, 9, HAIR);
        R(-6, -25, 4, 2, HAIR_D);
        R(2, -30, 2, 2, '#2b1d14');
        R(4, -27, 1, 1, '#f3a08a');
      } else {
        R(-5, -33, 10, 9, SKIN);
        R(-6, -35, 12, 4, HAIR);
        R(-6, -33, 2, 9, HAIR); R(4, -33, 2, 9, HAIR);
        R(-6, -25, 2, 2, HAIR_D); R(4, -25, 2, 2, HAIR_D);
        R(-3, -30, 2, 2, '#2b1d14'); R(1, -30, 2, 2, '#2b1d14');
        R(-4, -27, 1, 1, '#f3a08a'); R(3, -27, 1, 1, '#f3a08a');
      }

      // 모자
      if (opts.hat) {
        R(-9, -36, 18, 2, HAT_D);
        R(-6, -38, 12, 2, HAT_BAND);
        R(-5, -42, 10, 4, HAT);
        R(-3, -46, 7, 4, HAT);
        R(-1, -49, 5, 3, HAT);
        R(2, -51, 4, 2, HAT_D);
      }

      // 지팡이 끝 빛
      if (p.cast > 0) {
        let gx = ox, gy = oy;
        if (facing === 'side') { gx = flip ? ox - 18 : ox + 18; gy = oy - 22; }
        else { gx = flip ? ox - 7 : ox + 7; gy = oy - 33; }
        ctx.globalCompositeOperation = 'lighter';
        glow(gx, gy, 12, p.flying ? '#ffd86b' : '#8fe9ff', p.cast * 5);
        ctx.globalCompositeOperation = 'source-over';
      }
    }

    // -------------------------------------------------------------------------
    // 프레임 렌더
    // -------------------------------------------------------------------------
    function render() {
      const v = state.view;
      ctx.setTransform(v.zoom, 0, 0, v.zoom, 0, 0);
      ctx.imageSmoothingEnabled = false;

      // 배경 (노을 하늘 → 숲)
      const bg = ctx.createLinearGradient(0, 0, 0, v.h);
      bg.addColorStop(0, '#f2c58c');
      bg.addColorStop(0.35, '#9cb0bf');
      bg.addColorStop(1, '#2e4a2c');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, v.w, v.h);
      // 원경 산
      const px = -state.cam.x * 0.08, py = -state.cam.y * 0.05;
      ctx.fillStyle = '#6d8079';
      ctx.beginPath(); ctx.moveTo(-50, v.h);
      for (let i = -1; i <= 12; i++) {
        const mx = i * 90 + (px % 90);
        ctx.lineTo(mx, v.h * 0.35 + py + Math.sin(i * 1.9) * 30 + 40);
      }
      ctx.lineTo(v.w + 50, v.h); ctx.closePath(); ctx.fill();

      // 보이는 타일 범위
      const visible = (tx, ty, extraTop) => {
        const c = toScreen(tx + 0.5, ty + 0.5, 0);
        return c.x > -TW * 1.5 && c.x < v.w + TW * 1.5 && c.y > -TH * 2 && c.y < v.h + (extraTop || 0) + TH;
      };

      // 1) 지면
      for (let ty = 0; ty < MAP_H; ty++) {
        for (let tx = 0; tx < MAP_W; tx++) {
          if (visible(tx, ty, 0)) drawGroundTile(tx, ty);
        }
      }
      // 맵 가장자리 두께
      ctx.fillStyle = '#4a3a28';
      {
        const a = toScreen(0, MAP_H, 0), b = toScreen(MAP_W, MAP_H, 0), c = toScreen(MAP_W, 0, 0);
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(b.x, b.y + 14); ctx.lineTo(a.x, a.y + 14); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#3a2d1f';
        ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(c.x, c.y + 14); ctx.lineTo(b.x, b.y + 14); ctx.closePath(); ctx.fill();
      }

      // 2) 그림자 (지면 위)
      const p = state.player;
      shadow(p.x, p.y, Math.max(5, 11 - p.z * 0.06), (0.32 - p.z * 0.0015).toFixed(3));
      state.pixies.forEach((q) => { if (q.alive) shadow(q.x, q.y, 5, 0.18); });
      state.bolts.forEach((b) => shadow(b.x, b.y, 4, 0.15));

      // 3) 깊이 정렬 오브젝트
      const list = [];
      for (let ty = 0; ty < MAP_H; ty++) {
        for (let tx = 0; tx < MAP_W; tx++) {
          const o = map.obj[map.idx(tx, ty)];
          if (o && visible(tx, ty, 260)) list.push({ d: tx + ty + 1, f: drawObject, a: o, b: tx, c: ty });
        }
      }
      list.push({ d: p.x + p.y + (p.z > 10 ? 0.6 : 0), f: drawPlayer });
      state.pumpkins.forEach((q) => { if (q.alive) list.push({ d: q.x + q.y, f: drawPumpkin, a: q }); });
      state.pixies.forEach((q) => { if (q.alive) list.push({ d: q.x + q.y + 0.3, f: drawPixie, a: q }); });
      state.bolts.forEach((q) => list.push({ d: q.x + q.y + 0.4, f: drawBolt, a: q }));
      state.particles.forEach((q) => list.push({ d: q.x + q.y + (q.z > 40 ? 0.8 : 0.2), f: drawParticle, a: q }));
      list.sort((m, n) => m.d - n.d);
      for (const it of list) it.f(it.a, it.b, it.c);

      // 4) 분위기 비네트
      const vg = ctx.createRadialGradient(v.w / 2, v.h / 2, v.h * 0.3, v.w / 2, v.h / 2, v.h * 0.95);
      vg.addColorStop(0, 'rgba(255,200,140,0)');
      vg.addColorStop(1, 'rgba(40,20,10,0.35)');
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, v.w, v.h);

      drawHUD();
    }

    function roundRect(x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    }

    function drawHUD() {
      const v = state.view, p = state.player;
      ctx.textBaseline = 'middle';
      // 점수 패널
      ctx.fillStyle = 'rgba(15,18,30,0.72)';
      roundRect(10, 10, 168, 56, 8); ctx.fill();
      ctx.fillStyle = '#ffd86b';
      ctx.font = 'bold 15px system-ui, -apple-system, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
      ctx.fillText('✨ 점수 ' + state.score, 20, 26);
      ctx.fillStyle = '#e6e6f0';
      ctx.font = '12px system-ui, -apple-system, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
      ctx.fillText('🎃 ' + state.stats.pumpkin + '   🧚 ' + state.stats.pixie + '   🏅 ' + state.stats.hoop, 20, 48);

      // 모드
      const mode = p.flying ? '🧹 비행 중' : '🚶 걷는 중';
      ctx.fillStyle = p.flying ? 'rgba(90,60,150,0.8)' : 'rgba(15,18,30,0.72)';
      roundRect(v.w - 108, 10, 98, 28, 8); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 13px system-ui, -apple-system, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(mode, v.w - 59, 24);

      // 토스트
      state.toasts.forEach((t, i) => {
        const a = t.t < 1.4 ? 1 : 1 - (t.t - 1.4) / 0.4;
        ctx.globalAlpha = clamp(a, 0, 1);
        ctx.font = 'bold 14px system-ui, -apple-system, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
        const w = ctx.measureText(t.text).width + 24;
        const y = 70 + i * 32 - Math.min(t.t, 0.2) * 20;
        ctx.fillStyle = 'rgba(15,18,30,0.75)';
        roundRect(v.w / 2 - w / 2, y - 13, w, 26, 13); ctx.fill();
        ctx.fillStyle = t.color;
        ctx.fillText(t.text, v.w / 2, y);
        ctx.globalAlpha = 1;
      });

      // 조작 도움말
      if (!touchUI) {
        const help = 'WASD/방향키 이동 · Space 빗자루 · F 마법';
        ctx.font = '12px system-ui, -apple-system, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
        const w = ctx.measureText(help).width + 20;
        ctx.fillStyle = 'rgba(15,18,30,0.6)';
        roundRect(v.w / 2 - w / 2, v.h - 32, w, 22, 11); ctx.fill();
        ctx.fillStyle = '#e6e6f0';
        ctx.fillText(help, v.w / 2, v.h - 21);
      }
      ctx.textAlign = 'left';

      // 시작 오버레이
      if (!state.focused) {
        ctx.fillStyle = 'rgba(10,10,25,0.45)';
        ctx.fillRect(0, 0, v.w, v.h);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 22px system-ui, -apple-system, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
        ctx.fillText('▶ 클릭해서 시작', v.w / 2, v.h / 2 - 10);
        ctx.font = '13px system-ui, -apple-system, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
        ctx.fillStyle = '#dde';
        ctx.fillText('호박🎃·픽시🧚를 마법으로 맞히고, 빗자루로 골대🏅를 통과하세요!', v.w / 2, v.h / 2 + 18);
        ctx.textAlign = 'left';
      }
    }

    // -------------------------------------------------------------------------
    // 리사이즈 & 루프
    // -------------------------------------------------------------------------
    function resize() {
      const rect = wrap.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cssW = Math.max(200, rect.width), cssH = Math.max(150, rect.height);
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      const scale = clamp(cssW / 620, 0.6, 2.4);
      state.view.zoom = scale * dpr;
      state.view.w = canvas.width / state.view.zoom;
      state.view.h = canvas.height / state.view.zoom;
      state.view.dpr = dpr;
    }
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    if (ro) ro.observe(wrap); else window.addEventListener('resize', resize);
    resize();

    // 카메라 초기 위치
    state.cam.x = (state.player.x - state.player.y) * HW;
    state.cam.y = (state.player.x + state.player.y) * HH - 20;

    let raf = 0, last = performance.now(), running = true;
    function frame(now) {
      if (!running) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (state.focused) update(dt);
      else state.t += dt; // 일시정지 중에도 물결/불빛은 움직이게
      render();
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    if (opts.autoFocus) canvas.focus({ preventScroll: true });

    const api = {
      canvas,
      get score() { return state.score; },
      focus() { canvas.focus({ preventScroll: true }); },
      destroy() {
        running = false;
        cancelAnimationFrame(raf);
        if (ro) ro.disconnect(); else window.removeEventListener('resize', resize);
        wrap.remove();
        delete container.__magicGame;
      },
    };
    container.__magicGame = api;
    return api;
  }

  // ---------------------------------------------------------------------------
  // 스타일 (한 번만 주입)
  // ---------------------------------------------------------------------------
  function injectStyles() {
    if (document.getElementById('mqg-styles')) return;
    const css = `
.mqg-wrap{position:relative;width:100%;aspect-ratio:16/9;max-height:80vh;border-radius:14px;overflow:hidden;
  background:#2e4a2c;box-shadow:0 10px 30px rgba(0,0,0,.35);user-select:none;-webkit-user-select:none;touch-action:none}
.mqg-canvas{display:block;width:100%;height:100%;outline:none;cursor:pointer}
.mqg-canvas:focus-visible{box-shadow:inset 0 0 0 3px #ffd86b}
.mqg-touch{position:absolute;inset:auto 0 10px 0;display:flex;justify-content:space-between;padding:0 12px;pointer-events:none}
.mqg-touch button{pointer-events:auto;width:46px;height:46px;border:0;border-radius:50%;background:rgba(15,18,30,.6);
  color:#fff;font-size:18px;touch-action:none}
.mqg-touch button:active{background:rgba(90,60,150,.85)}
.mqg-pad{display:grid;grid-template-columns:46px 46px 46px;grid-template-rows:46px 46px 46px;gap:2px}
.mqg-pad .u{grid-area:1/2}.mqg-pad .l{grid-area:2/1}.mqg-pad .r{grid-area:2/3}.mqg-pad .d{grid-area:3/2}
.mqg-act{display:flex;gap:12px;align-items:flex-end}
.mqg-act button{width:58px;height:58px;font-size:24px}
@media (max-width:600px){
  .mqg-wrap{aspect-ratio:4/3}
  .mqg-touch button{width:34px;height:34px;font-size:13px;background:rgba(15,18,30,.45)}
  .mqg-pad{grid-template-columns:34px 34px 34px;grid-template-rows:34px 34px 34px}
  .mqg-act button{width:44px;height:44px;font-size:18px}
}
`;
    const style = document.createElement('style');
    style.id = 'mqg-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  // ---------------------------------------------------------------------------
  // 자동 마운트: <div data-magic-game></div>
  // ---------------------------------------------------------------------------
  function autoMount() {
    document.querySelectorAll('[data-magic-game]').forEach((el) => mount(el));
  }
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', autoMount);
    else autoMount();
  }

  global.MagicQuarterGame = { mount };
})(typeof window !== 'undefined' ? window : this);
