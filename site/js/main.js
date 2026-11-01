/* isaacadekunle.com. Vanilla JS, no dependencies.
   One rAF loop, damped, runs only while a scene is on screen and motion is on.
   Everything here is enhancement: with JS off or motion off the page is a static storyboard. */
(() => {
  'use strict';
  const root = document.documentElement;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const seg = (p, a, b) => clamp((p - a) / (b - a));
  const ease = t => t * t * (3 - 2 * t);
  const lerp = (a, b, t) => a + (b - a) * t;
  const NS = 'http://www.w3.org/2000/svg';
  const mk = (tag, attrs = {}, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };
  const off = el => el && (el.style.strokeDashoffset = 1);
  const draw = (el, v) => { if (el) el.style.strokeDashoffset = (1 - clamp(v)).toFixed(4); };
  const mqMobile = matchMedia('(max-width: 52rem)');
  const motionOn = () => root.getAttribute('data-motion') !== 'off';

  /* ---------- motion toggle (WCAG 2.2.2) ---------- */
  const tgl = $('[data-motion-toggle]'), lbl = $('[data-motion-label]');
  function syncToggle() { const o = !motionOn(); tgl.setAttribute('aria-pressed', String(o)); lbl.textContent = o ? 'Turn motion on' : 'Turn motion off'; }
  tgl.addEventListener('click', () => {
    const next = motionOn() ? 'off' : 'on';
    root.setAttribute('data-motion', next);
    try { localStorage.setItem('motion', next); } catch (e) {}
    syncToggle(); applyMotion();
  });
  syncToggle();

  /* ---------- mobile art crops ---------- */
  function applyCrops() {
    $$('svg[data-vb-mobile]:not([data-vb-fit])').forEach(svg => {
      if (!svg.dataset.vbDesktop) svg.dataset.vbDesktop = svg.getAttribute('viewBox');
      svg.setAttribute('viewBox', mqMobile.matches ? svg.dataset.vbMobile : svg.dataset.vbDesktop);
    });
  }

  /* ---------- scenes ---------- */
  const scenes = [];
  const stageProgress = el => { const r = el.getBoundingClientRect(); return clamp(-r.top / Math.max(1, r.height - innerHeight)); };
  const bandProgress = el => { const r = el.getBoundingClientRect(); return clamp((innerHeight - r.top) / (innerHeight + r.height)); };

  /* ISOLATE: a lamp searches a field of marks, the radius narrows, one fault is found, a person gates the exit.
     The marks are small magnets of mixed polarity (spring + damping): the cursor (or, with no cursor or on touch, the lamp and
     the scroll movement) attracts some and repels others. The fault is lit by a thin laser (gradient bloom, no stroke). */
  function isolate(el) {
    const lamp = $('#lamp', el), cam = $('#cam', el), fault = $('#fault', el), arm = $('#gate1arm', el), gate = $('#gate1', el);
    const f = ['f2', 'f3'].map(id => [$('#' + id, el), $('#' + id + 'h', el), $('#' + id + 'g', el)]);
    const trail = $('#lz-trail', el), ltS = [0, 1, 2].map(i => $('#lt-s' + i, el)), ltW = [[...$$('.lt--core', el)], [...$$('.lt--glow', el)], [...$$('.lt--bloom', el)]];
    const rings = $$('.ring', el), mkAll = $$('.mk', el);
    const path = [[0, 300, 300], [.1, 620, 640], [.2, 960, 260], [.3, 1120, 470]];
    const rad = [[0, 230], [.3, 230], [.38, 560], [.42, 560], [.5, 330], [.54, 330], [.62, 170], [.66, 170], [.76, 60]];
    const at = (k, p) => { let i = 0; while (i < k.length - 2 && p > k[i + 1][0]) i++; const a = k[i], b = k[i + 1]; const t = ease(seg(p, a[0], b[0])); return b.slice(1).map((v, j) => lerp(a[j + 1], v, t)); };
    f.forEach(([c, h, g]) => { off(c); off(h); off(g); });

    /* ----- laser ----- */
    const laser = $('#laser', el), lzCore = $('#lz-core', el), lzGlow = $('#lz-glow', el), lzBloom = $('#lz-bloom', el), lzHot = $('#lz-hot', el), svgEl = $('svg.art', el);
    const lzS = [1, 2, 3].map(i => $('#lz-s' + i, el)), hotKids = $$('circle', lzHot);
    let pxScale = 1, camS = 1;
    const measure = () => { try { pxScale = cam.getScreenCTM().a || 1; } catch (e) {} };
    const laserLook = (on, t, instant) => {
      /* on: 0..1 strike intensity; t: seconds (flicker/shimmer); core stays 1.5 screen px at any zoom */
      const n = instant ? 0 : .5 * Math.sin(t * 37.1) + .3 * Math.sin(t * 61.7 + 1.3) + .2 * Math.sin(t * 13.3 + .4);
      const fl = 1 + .06 * n, k = pxScale || 1;
      laser.style.opacity = (on * Math.min(1, fl)).toFixed(3);
      const ch = 1.5 / k; lzCore.setAttribute('height', ch.toFixed(3)); lzCore.setAttribute('y', (-ch / 2).toFixed(3));
      const gh = 9 / k; lzGlow.setAttribute('height', gh.toFixed(2)); lzGlow.setAttribute('y', (-gh / 2).toFixed(2));
      const bh = 64 / k; lzBloom.setAttribute('height', bh.toFixed(1)); lzBloom.setAttribute('y', (-bh / 2).toFixed(1));
      const c = instant ? .5 : (t * .42) % 1;               /* a faint bright band slides down the beam */
      lzS[0].setAttribute('offset', clamp(c - .14, .02, .96).toFixed(3)); lzS[1].setAttribute('offset', clamp(c, .03, .97).toFixed(3)); lzS[2].setAttribute('offset', clamp(c + .08, .04, .98).toFixed(3));
      const hs = on * (1 + .08 * n + (instant ? 0 : .05 * Math.sin(t * 23.9 + 2)));
      /* the line leaving the fault is the same laser: 1.5 px core, thin glow, soft bloom (widths kept in screen px), same flicker + sliding shimmer band */
      const wd = [1.5, 4, 11].map(v => (v / k).toFixed(3)); ltW.forEach((a, i) => a.forEach(e => e.setAttribute('stroke-width', wd[i])));
      trail.style.opacity = Math.min(1, fl).toFixed(3);
      const tc = instant ? .4 : (t * .37 + .2) % 1.25 - .1;
      ltS[0].setAttribute('offset', clamp(tc - .12, .01, .97).toFixed(3)); ltS[1].setAttribute('offset', clamp(tc, .02, .98).toFixed(3)); ltS[2].setAttribute('offset', clamp(tc + .07, .03, .99).toFixed(3));
      lzHot.setAttribute('transform', `translate(1120 470) scale(${(Math.max(.01, hs) / k).toFixed(3)})`);
    };

    /* ----- magnets ----- */
    const bands = $$('path.mk--dim', el);
    const marks = [];   /* rest geometry parsed from the generated field */
    const bandIdx = [];
    const litPaths = $$('path.mk--lit', el);
    const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
    bands.forEach((pe, bi) => {
      const rest = pe.getAttribute('d'); pe.dataset.rest = rest;
      const re = /M(-?[\d.]+) (-?[\d.]+)l(-?[\d.]+) (-?[\d.]+)/g; let m, from = marks.length;
      while ((m = re.exec(rest))) {
        const x = +m[1], y = +m[2], dx = +m[3], dy = +m[4], i = marks.length;
        const cx = x + dx / 2, cy = y + dy / 2;
        /* polarity in domains (like magnetic domains) with some noise: roughly half attract, half repel */
        const dom = Math.sin(cx * .0105 + 1.3) * Math.cos(cy * .0125 - .7) + .55 * Math.sin((cx + cy) * .0062 + 2.1);
        const pol = (dom + (hash(i) - .5) * .5) > 0 ? 1 : -1;
        marks.push({ b: bi, cx, cy, len: Math.hypot(dx, dy), a0: Math.atan2(dy, dx), pol, mass: .75 + hash(i + 9) * .6, ox: 0, oy: 0, vx: 0, vy: 0, th: 0, tv: 0 });
      }
      bandIdx.push([from, marks.length]);
    });
    const rm = matchMedia('(prefers-reduced-motion: reduce)');
    const fine = matchMedia('(hover: hover) and (pointer: fine)');
    const mouse = { x: 0, y: 0, on: false, t: 0 };
    addEventListener('pointermove', e => { if (e.pointerType === 'touch' || !fine.matches) return; mouse.x = e.clientX; mouse.y = e.clientY; mouse.on = true; mouse.t = performance.now(); }, { passive: true });
    document.addEventListener('pointerleave', () => { mouse.on = false; });
    addEventListener('blur', () => { mouse.on = false; });
    let lastY = scrollY, lastNow = 0, moving = false, wasStatic = true, lampXY = [300, 300, 230];
    const physicsOn = () => motionOn() && !rm.matches;
    const restore = () => { bands.forEach(pe => pe.setAttribute('d', pe.dataset.rest)); litPaths.forEach((pe, i) => pe.setAttribute('d', bands[i].dataset.rest)); marks.forEach(m => { m.ox = m.oy = m.vx = m.vy = m.th = m.tv = 0; }); moving = false; };
    function step(dt, now) {
      const r = cam.getBoundingClientRect(), sr = svgEl.getBoundingClientRect();
      /* source: the cursor while it is over the scene, otherwise the lamp (scroll-driven) */
      let sx = lampXY[0], sy = lampXY[1], R = clamp(lampXY[2] * .75, 110, 260), str = .6;
      if (mouse.on && now - mouse.t < 4000 && mouse.x >= sr.left && mouse.x <= sr.right && mouse.y >= sr.top && mouse.y <= sr.bottom) {
        try { const q = new DOMPoint(mouse.x, mouse.y).matrixTransform(cam.getScreenCTM().inverse()); sx = q.x; sy = q.y; R = 250; str = 1; } catch (e) {}
      }
      const dy = clamp(scrollY - lastY, -60, 60); lastY = scrollY;
      const k = 40, c = 10.5, A = 15, sub = Math.max(1, Math.ceil(dt / .017)), h = dt / sub;
      let energy = 0;
      for (const m of marks) {
        const px = m.cx - sx, py = m.cy - sy, d = Math.hypot(px, py) || 1;
        const w = Math.exp(-(d * d) / (2 * (R * .55) * (R * .55))) * str;
        const ux = -px / d, uy = -py / d;                        /* unit vector towards the source */
        const tx = m.pol * A * w * ux, ty = m.pol * A * w * uy;   /* attract (+) or repel (-) */
        /* needles tend to align with the field direction; mixed polarity turns them opposite ways */
        let da = Math.atan2(uy, ux) - m.a0; da = Math.atan2(Math.sin(2 * da), Math.cos(2 * da)) / 2;
        const tth = da * Math.min(.4, w * .55) * (m.pol > 0 ? 1 : .5);
        if (dy) { m.vy += m.pol * dy * 1.7 * m.mass; m.vx += m.pol * dy * .5 * m.mass * (hash(m.cx) - .5); }   /* scroll nudges them, opposite ways for opposite polarity */
        for (let i = 0; i < sub; i++) {
          m.vx += (k * (tx - m.ox) - c * m.vx) * h; m.vy += (k * (ty - m.oy) - c * m.vy) * h; m.tv += (k * 1.3 * (tth - m.th) - c * .95 * m.tv) * h;
          m.ox += m.vx * h; m.oy += m.vy * h; m.th += m.tv * h;
        }
        energy += Math.abs(m.vx) + Math.abs(m.vy) + Math.abs(m.ox) + Math.abs(m.oy) + Math.abs(m.th) * 8;
      }
      if (energy < .4) { if (moving) restore(); return; }
      moving = true;
      for (let bi = 0; bi < bands.length; bi++) {
        let dd = '';
        for (let i = bandIdx[bi][0]; i < bandIdx[bi][1]; i++) {
          const m = marks[i], a = m.a0 + m.th, hx = Math.cos(a) * m.len / 2, hy = Math.sin(a) * m.len / 2, x = m.cx + m.ox, y = m.cy + m.oy;
          dd += `M${(x - hx).toFixed(1)} ${(y - hy).toFixed(1)}L${(x + hx).toFixed(1)} ${(y + hy).toFixed(1)}`;
        }
        bands[bi].setAttribute('d', dd); litPaths[bi].setAttribute('d', dd);
      }
    }

    let strike = 0;
    return (p, instant) => {
      const now = performance.now(), dt = clamp((now - (lastNow || now - 16)) / 1000, .004, .05); lastNow = now;
      const [x, y] = at(path, Math.min(p, .3)), [r] = at(rad, p);
      lampXY = [x, y, r];
      lamp.setAttribute('cx', x.toFixed(1)); lamp.setAttribute('cy', y.toFixed(1)); lamp.setAttribute('r', r.toFixed(1));
      rings.forEach((rg, i) => rg.style.strokeDashoffset = (1 - seg(p, [.36, .48, .6][i], [.44, .56, .68][i])).toFixed(3));
      [0, 1, 2].forEach(b => { const o = 1 - .85 * seg(p, [.42, .54, .66][b], [.5, .62, .74][b]); mkAll.filter(m => m.dataset.band == b).forEach(m => m.style.opacity = o.toFixed(3)); });
      const s = 1 + (mqMobile.matches ? .22 : .5) * ease(seg(p, .4, .8));
      cam.setAttribute('transform', `translate(1120 470) scale(${s.toFixed(3)}) translate(-1120 -470)`);
      if (s !== camS) { camS = s; measure(); }
      fault.style.opacity = seg(p, .68, .76).toFixed(3);
      /* the laser strikes the fault: intensity ramps with scroll, then flickers; the line carries on from the fault */
      strike = seg(p, .72, .78);
      laserLook(strike, now / 1000, instant);
      [0, 1, 2].forEach(i => draw(f[0][i], seg(p, .78, .88)));
      gate.style.opacity = seg(p, .84, .88).toFixed(3);
      arm.setAttribute('transform', `rotate(${(-78 * ease(seg(p, .9, .95))).toFixed(1)} -34 -4)`);
      [0, 1, 2].forEach(i => draw(f[1][i], seg(p, .94, 1)));
      if (instant || !physicsOn()) { if (moving || !wasStatic) restore(); wasStatic = true; return false; }
      wasStatic = false; step(dt, now);
      return true;   /* keeps the frame loop alive while the scene is on screen */
    };
  }

  /* TRACE: one filament follows the path through three stages to a human gate, then (only once the gate is fully open) on into a
     governance building, lighting it, and out and down into RELEASE. Every write-up is revealed by the line's own drawn length
     (px along the real path), never by scroll offsets, and the head can never pass the gate before the gate has finished opening. */
  let exitXs = null;                                   /* screen x where the line leaves TRACE: INTERLUDE and RELEASE pick it up from here */
  function trace(el) {
    const svg = $('svg.art', el), ghost = $('#trail-d', el), ghostB = $('#trail-bd', el), coreA = $('#trail', el), haloA = $('#trail-h', el), coreB = $('#trail-b', el), haloB = $('#trail-bh', el);
    const echoes = $('#echoes', el), st = $('#stations', el), head = $('#head', el), gate = $('#gate2', el), arm = $('#gate2arm', el), hair = $('.hair', el), bldg = $('#bldg', el);
    const fig = $('#approver', el), ring = $('#approver-ring', el), tick = $('#approver-tick', el), link = $('#approver-link', el);
    const steps = $$('.step[data-station]', el), panels = steps.map(s => $('.panel', s)), sceneStages = $('.stage', el);
    const msteps = $$('.step[data-method]', el), mpanels = msteps.map(s => $('.panel', s)), gstep = steps[3];
    const F = [.18, .38, .58], GATE = .8;
    const T_WAIT = 800, T_APPROVE = 600, T_OPEN = 450;      /* ms from the line reaching the closed gate: panel in at 250, she approves 800-1400, gate opens 1400-1850, line moves on */
    const T_PANEL = 250;
    const desktopD = ghost.getAttribute('d'), mobileD = ghost.dataset.dMobile;
    let stationEls = [], pts = [], echo = [], L0 = 1, LA = 1, LB = 1, LT = 2, Rst = [], cap = 1, K = [], G = { x: 0, y: 0 };
    let rend = null, lp = 0, li = false, vb0 = [0, 0, 1600, 900], panMax = 0, lenEntry = 1, lenExit = 1, mThr = [], B = null, bParts = [];
    const BW = 560, BH = 600;
    function fitBox() {   /* desktop/tablet: always show the whole path width */
      if (mqMobile.matches) { vb0 = svg.dataset.vbMobile.split(' ').map(Number); }
      else { const asp = innerWidth / Math.max(1, innerHeight), H = Math.max(900, 1480 / asp); vb0 = [60, 450 - H / 2, 1480, H]; }
      svg.setAttribute('viewBox', vb0.join(' '));
    }
    /* a classical building drawn as fine lines. [path, cx, cy] in building units: origin = base centre, y up is negative */
    function buildingParts() {
      const P = [], add = (d, cx, cy) => P.push([d, cx, cy]);
      for (let i = 0; i < 4; i++) { const w = 280 - i * 22, y = -i * 14; add(`M${-w} ${y}H${w}V${y - 14}H${-w}Z`, 0, y - 7); }
      [-180, -108, -36, 36, 108, 180].forEach(x => {
        add(`M${x - 17} -56H${x + 17}V-64H${x - 17}Z`, x, -60);
        add(`M${x - 11} -64L${x - 10} -226M${x + 11} -64L${x + 10} -226M${x - 3.5} -68V-222M${x + 3.5} -68V-222`, x, -145);
        add(`M${x - 15} -226H${x + 15}V-236H${x - 15}ZM${x - 19} -236H${x + 19}V-244H${x - 19}Z`, x, -235);
      });
      add('M-215 -244H215V-262H-215Z', 0, -253);
      let tg = ''; for (let x = -203; x <= 203; x += 24) tg += `M${x} -262V-280`; add('M-215 -262H215V-280H-215Z' + tg, 0, -271);
      add('M-232 -280H232V-292H-232Z', 0, -286);
      add('M-232 -292L0 -372L232 -292Z', 0, -318);
      add('M-198 -296L0 -358L198 -296M-12 -322a12 12 0 1 0 24 0a12 12 0 1 0 -24 0', 0, -326);
      const yy = x => -372 + 80 * Math.abs(x) / 232; let dr = ''; [-92, -46, 0, 46, 92].forEach(x => { dr += `M${x} ${yy(x).toFixed(1)}V-420`; }); add(dr, 0, -392);
      add('M-104 -420H104V-432H-104Z', 0, -426);
      add('M-92 -432C-92 -500 -52 -540 0 -552C52 -540 92 -500 92 -432M-48 -432C-52 -490 -28 -534 0 -552M48 -432C52 -490 28 -534 0 -552M0 -432V-552', 0, -490);
      add('M-12 -552V-572H12V-552M-16 -572H16M0 -572V-596', 0, -574);
      add('M-300 0H300', 0, 0);
      return P;
    }
    const bnode = (cls, parent, d) => mk('path', { class: cls, d }, parent);
    function buildBldg() {
      bldg.textContent = ''; bParts = [];
      const gG = mk('g', { class: 'b-glow-g', filter: 'url(#bldgblur)' }, bldg), gB = mk('g', {}, bldg), gO = mk('g', {}, bldg);
      buildingParts().forEach(([d, cx, cy]) => { bParts.push({ cx, cy, base: bnode('b-base', gB, d), gold: bnode('b-gold', gO, d), glow: bnode('b-glow', gG, d) }); });
    }
    /* find the length along a path where a predicate first holds */
    const lenWhere = (path, total, f) => { for (let l = 0; l <= total; l += 2) { const q = path.getPointAtLength(l); if (f(q)) return l; } return total; };
    const sPoint = len => { if (len <= LA) return ghost.getPointAtLength(clamp(len, 0, LA)); return ghostB.getPointAtLength(clamp(len - LA, 0, LB)); };
    function layout() {
      fitBox();
      const mobile = mqMobile.matches;
      const dA = mobile ? mobileD : desktopD;
      ghost.setAttribute('d', dA); coreA.setAttribute('d', dA); haloA.setAttribute('d', dA);
      L0 = ghost.getTotalLength(); LA = GATE * L0;
      G = ghost.getPointAtLength(LA);
      hair.textContent = ''; for (let i = -4; i < 16; i++) mk('line', { x1: -200, x2: 1800, y1: 40 + i * 82, y2: 40 + i * 82 }, hair);
      st.textContent = ''; echoes.textContent = '';
      pts = F.map(f => ghost.getPointAtLength(f * L0));
      stationEls = pts.map(pt => { const g = mk('g', { class: 'st', transform: `translate(${pt.x.toFixed(1)} ${pt.y.toFixed(1)})` }, st); mk('path', { class: 'st__tick', d: 'M0 -34V34' }, g); mk('circle', { class: 'st__ring', r: 11 }, g); return g; });
      gate.setAttribute('transform', `translate(${G.x.toFixed(1)} ${G.y.toFixed(1)})`);
      cap = LA - 12;                                    /* the filament stops 12 units short of the closed gate arm */
      Rst = [F[0] * L0, F[1] * L0, F[2] * L0, cap];
      echo = [[mobile ? 70 : 90, 46], [mobile ? -60 : -70, -58]].map(([dx, dy]) => mk('path', { class: 'echo', pathLength: 1, d: dA, transform: `translate(${dx} ${dy})` }, echoes));
      /* ---- governance building and the route through it (screen-driven, then converted to path units) ---- */
      const ctm0 = svg.getScreenCTM(); if (!ctm0) return;
      const sRect = svg.getBoundingClientRect(), a = ctm0.a, e0 = ctm0.e - sRect.left, f0 = ctm0.f - sRect.top, Hs = innerHeight, W = innerWidth;
      const mg = parseFloat(getComputedStyle(root).getPropertyValue('--page-margin')) || 40;
      const panelW = mobile ? 0 : Math.min(34 * 16, Math.max(24 * 16, W * .4));
      let bx, yb, sU, xe, yEnd, yL, gx = G.x, gy = G.y;
      if (!mobile) {
        const gxs = a * G.x + e0, lb = mg + panelW + 106, rb = gxs - 80, bwS = Math.min(.74 * BW, rb - lb), sS = Math.min(bwS / BW, (Hs - 64 - 70) / BH);
        const cxs = (lb + rb) / 2, baseS = Hs - 64;
        /* the camera drops down below the earlier stages so the building stands in clear space (nothing from the path sits behind it) */
        let maxY = 0; for (let l = 0; l <= LA; l += 20) maxY = Math.max(maxY, ghost.getPointAtLength(l).y);
        panMax = maxY + 40 - vb0[1];
        sU = sS / a; bx = (cxs - e0) / a; yb = panMax + (baseS - f0) / a;
        xe = (lb - 70 - e0) / a; exitXs = lb - 70; yEnd = yb + (Hs + 90 - baseS) / a;
      } else {
        const k = a, maxH = Math.max(300, ...mpanels.map(p => p.getBoundingClientRect().height || 0));
        const baseS = clamp(Hs - maxH - 36, 260, 420), sS = Math.min(.5, (baseS - 66) / BH, (W - 90) / BW);
        sU = sS / k; bx = (W / 2 - e0) / k; yb = G.y + 520; panMax = yb - (baseS - f0) / k;
        xe = (12 - e0) / k; exitXs = 12; yEnd = yb + (Hs - baseS + 90) / a;
      }
      const r = 70 / a * (mobile ? .8 : 1);
      yL = yb - 150 * sU;
      const xr = bx + 280 * sU, xl = bx - 280 * sU;
      let dB;
      if (!mobile) dB = `M${gx.toFixed(1)} ${gy.toFixed(1)}L${gx.toFixed(1)} ${(yL - r).toFixed(1)}Q${gx.toFixed(1)} ${yL.toFixed(1)} ${(gx - r).toFixed(1)} ${yL.toFixed(1)}L${(xe + r).toFixed(1)} ${yL.toFixed(1)}Q${xe.toFixed(1)} ${yL.toFixed(1)} ${xe.toFixed(1)} ${(yL + r).toFixed(1)}L${xe.toFixed(1)} ${yEnd.toFixed(1)}`;
      else { const xs2 = (W - 38 - e0) / a, y1 = gy + 150; dB = `M${gx.toFixed(1)} ${gy.toFixed(1)}L${gx.toFixed(1)} ${y1.toFixed(1)}C${gx.toFixed(1)} ${(y1 + 160).toFixed(1)} ${xs2.toFixed(1)} ${(y1 + 80).toFixed(1)} ${xs2.toFixed(1)} ${(y1 + 240).toFixed(1)}L${xs2.toFixed(1)} ${(yL - r).toFixed(1)}Q${xs2.toFixed(1)} ${yL.toFixed(1)} ${(xs2 - r).toFixed(1)} ${yL.toFixed(1)}L${(xe + r).toFixed(1)} ${yL.toFixed(1)}Q${xe.toFixed(1)} ${yL.toFixed(1)} ${xe.toFixed(1)} ${(yL + r).toFixed(1)}L${xe.toFixed(1)} ${yEnd.toFixed(1)}`; }
      ghostB.setAttribute('d', dB); coreB.setAttribute('d', dB); haloB.setAttribute('d', dB);
      LB = ghostB.getTotalLength(); LT = LA + LB;
      lenEntry = LA + lenWhere(ghostB, LB, q => q.y >= yL - 1 && q.x <= xr + 1);
      lenExit = LA + lenWhere(ghostB, LB, q => q.y >= yL - 1 && q.x <= xl);
      B = { bx, yb, sU, yL, xl, xr };
      bldg.setAttribute('transform', `translate(${bx.toFixed(1)} ${yb.toFixed(1)}) scale(${sU.toFixed(4)})`);
      /* ---- write-up sides ---- */
      const sr = el.getBoundingClientRect(), range = Math.max(1, sr.height - innerHeight);
      const topP = s => { const rr = s.getBoundingClientRect(); return clamp((rr.top - sr.top) / range); };
      const centreP = s => { const rr = s.getBoundingClientRect(); return clamp((rr.top - sr.top + rr.height / 2 - innerHeight / 2) / range); };
      const pp = steps.map((s, i) => i === 3 ? topP(s) : centreP(s));
      const pm = msteps.map(topP);
      /* scroll -> length keyframes; the line is held at the gate until the gate has opened (see render) */
      K = [[0, 0], [pp[0], Rst[0]], [pp[1], Rst[1]], [pp[2], Rst[2]], [pp[3], cap], [Math.min(pp[3] + .012, pm[0] - .005), cap], [pm[0], lenEntry], [pm[3], lenExit], [Math.max(.995, pm[3] + .01), LT], [1, LT]];
      const kAt = p => { let i = 0; while (i < K.length - 2 && p > K[i + 1][0]) i++; const a1 = K[i], b1 = K[i + 1]; return lerp(a1[1], b1[1], seg(p, a1[0], b1[0])); };
      mThr = pm.map((p, i) => i === 0 ? lenEntry - 2 : kAt(p) - 2);
      if (!mobile) {
        const ctm = svg.getScreenCTM(), pw = Math.min(31 * 16, innerWidth);
        const px = [...pts, G].map(q => ctm ? ctm.a * q.x + ctm.e : 0);
        steps.forEach((s, i) => { const leftEdge = mg + pw + 24; s.dataset.side = px[i] < leftEdge + 40 ? 'right' : 'left'; });
        msteps.forEach(s => s.dataset.side = 'left');
      } else {
        const ctm = svg.getScreenCTM(), top0 = svg.getBoundingClientRect().top;
        [...pts, G].forEach((q, i) => { const ny = ctm ? ctm.d * q.y + ctm.f - top0 : 0, ph = panels[i].getBoundingClientRect().height; steps[i].dataset.side = ny > innerHeight - ph - 70 - 36 ? 'top' : 'bottom'; });
        msteps.forEach(s => s.dataset.side = 'bottom');
      }
      /* the Stage 4 write-up is pinned level with the gate in the diagram, beside it, and stays while the gate sequence plays */
      {
        const ctm = svg.getScreenCTM(), gyS = ctm ? ctm.d * G.y + ctm.f - svg.getBoundingClientRect().top : innerHeight / 2, ph = panels[3].getBoundingClientRect().height || 220;
        const top = mqMobile.matches ? (steps[3].dataset.side === 'top' ? 66 : Math.max(66, innerHeight - ph - 22)) : clamp(gyS - ph / 2, 70, innerHeight - ph - 24);
        gstep.style.setProperty('--py', top.toFixed(0) + 'px');
      }
      /* the approver stands on the side of the gate that has room */
      const gxS = a * G.x + e0;
      fig.setAttribute('transform', gxS < innerWidth * .5 ? 'translate(112 0) scale(-1.4 1.4)' : 'translate(-112 0) scale(1.4)');
      buildBldg();
      if (rend) rend(lp, li);
      return L0;
    }
    layout();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { layout(); });
    mqMobile.addEventListener('change', layout);
    addEventListener('resize', layout);
    const tRaw = p => { let i = 0; while (i < K.length - 2 && p > K[i + 1][0]) i++; const a1 = K[i], b1 = K[i + 1]; return lerp(a1[1], b1[1], seg(p, a1[0], b1[0])); };
    panels.concat(mpanels).forEach(pn => pn.setAttribute('data-await', ''));
    let len = 0, tA = 0, apv = 0, opn = 0, gOpen = false, lastT = 0, gReveal = false, openAt = 0, pinned = false, pinTO = 0;
    const p4 = panels[3];
    /* the write-up is pinned level with the gate; if a fast scroll would carry its step away while the gate sequence is still playing, it is held fixed in place */
    const pinLogic = (now, instant) => {
      const need = !instant && gReveal && (!gOpen || now - openAt < 1800) && !!document.querySelector('html:not([data-motion="off"])');
      if (need) {
        clearTimeout(pinTO); p4.classList.remove('is-leaving');
        if (!pinned) {
          const r = p4.getBoundingClientRect(), py = parseFloat(gstep.style.getPropertyValue('--py')) || 0;
          if (Math.abs(r.top - py) > 2) { p4.style.setProperty('--pl', r.left + 'px'); p4.style.setProperty('--pw', r.width + 'px'); p4.classList.add('is-pinned'); pinned = true; }
        }
      } else if (pinned) {
        p4.classList.add('is-leaving'); pinned = false;
        clearTimeout(pinTO); pinTO = setTimeout(() => { if (!pinned) p4.classList.remove('is-pinned', 'is-leaving'); }, 420);
      }
    };
    const dash = (c, h, l, total) => { [c, h].forEach(e => { if (l <= .6) e.style.display = 'none'; else { e.style.display = 'inline'; e.style.strokeDasharray = `${l.toFixed(1)} ${(total + 40).toFixed(0)}`; } }); };
    const lit = (len0, now) => {                          /* every part of the building is lit, spreading out from the line as it passes through */
      if (!B) return;
      const pt = sPoint(len0), hx = clamp(pt.x, B.xl, B.xr), hy = B.yL;
      const Rfull = Math.hypot(BW, BH * .7) * .62, soft = Rfull * .3;
      const Rg = (Rfull + soft) * ease(seg(len0, lenEntry - 12, lenExit + 4));
      const fl = 1 + (now ? .035 * Math.sin(now / 1000 * 31) : 0);
      bParts.forEach(pr => {
        const d = Math.hypot((B.bx + pr.cx * B.sU) - hx, (B.yb + pr.cy * B.sU) - hy) / B.sU;
        const v = clamp((Rg - d) / soft), o = ease(v) * fl;
        pr.gold.style.opacity = clamp(o).toFixed(3); pr.glow.style.opacity = clamp(o * .85).toFixed(3);
      });
    };
    rend = (p, instant) => {
      lp = p; li = !!instant;
      const now = performance.now(), dt = clamp((now - (lastT || now - 16)) / 1000, .004, .05); lastT = now;
      if (instant) { len = LT; opn = 1; apv = 1; gOpen = true; tA = 0; gReveal = true; }
      else {
        const raw = tRaw(p);
        /* scrolled back well before the gate: once the head is behind it, the gate shuts and the sequence will replay */
        if (raw < cap - .12 * L0 && len < cap - 6) { tA = 0; gOpen = false; gReveal = false; openAt = 0; }
        const target = gOpen ? raw : Math.min(raw, cap);
        const kk = 1 - Math.exp(-dt * 16), mx = 1.7 * L0 * dt;
        len += clamp((target - len) * kk, -mx, mx);
        if (Math.abs(target - len) < .3) len = target;
        if (!gOpen) len = Math.min(len, cap);               /* hard clamp: the head can never pass a gate that is not fully open */
        if (!gOpen && !tA && len >= cap - .6 && raw >= cap - .6) tA = now;
        if (tA && !gOpen) {
          const e = now - tA; apv = seg(e, T_WAIT, T_WAIT + T_APPROVE); opn = seg(e, T_WAIT + T_APPROVE, T_WAIT + T_APPROVE + T_OPEN);
          if (e >= T_PANEL) gReveal = true;
          if (opn >= 1) { gOpen = true; openAt = now; }
        } else if (!gOpen) { apv = Math.max(0, apv - dt * 3); opn = Math.max(0, opn - dt * 3); }
      }
      dash(coreA, haloA, Math.min(len, LA), L0); dash(coreB, haloB, Math.max(0, len - LA), LB);
      const t0 = Math.min(len, LA) / L0;
      echo.forEach((e, i) => draw(e, Math.min(GATE, t0 * (.9 - i * .15) - .06)));
      const pt = sPoint(clamp(len, .5, LT - .5)); head.setAttribute('cx', pt.x.toFixed(1)); head.setAttribute('cy', pt.y.toFixed(1)); head.style.opacity = len > 1 && len < LT - 2 ? 1 : 0;
      stationEls.forEach((g, i) => g.classList.toggle('on', len >= Rst[i] - .0005 * L0));
      panels.forEach((pn, i) => { const on = i < 3 ? len >= Rst[i] - .0006 * L0 : (gReveal || gOpen); if (on) pn.removeAttribute('data-await'); else pn.setAttribute('data-await', ''); });
      mpanels.forEach((pn, i) => { if (len >= mThr[i]) pn.removeAttribute('data-await'); else pn.setAttribute('data-await', ''); });
      gate.style.opacity = seg(len, Rst[2] + .02 * L0, cap - .06 * L0).toFixed(3);
      const ap = ease(apv);
      fig.style.opacity = (.5 + .5 * ap).toFixed(3);
      draw(ring, seg(ap, 0, .45)); draw(tick, seg(ap, .35, .8)); draw(link, seg(ap, .75, 1));
      arm.setAttribute('transform', `rotate(${(-78 * ease(opn)).toFixed(1)} -30 -4)`);
      gate.dataset.state = gOpen ? 'open' : opn > 0 ? 'opening' : apv > 0 ? 'approving' : 'closed';
      /* mobile camera follows the line down to the building after the gate */
      if (panMax) {
        if (instant) {                                      /* static storyboard: no camera move, the whole route is shown on a taller stage */
          const vh = vb0[3] + panMax; svg.setAttribute('viewBox', `${vb0[0]} ${vb0[1]} ${vb0[2]} ${vh.toFixed(1)}`); sceneStages.style.aspectRatio = `${vb0[2].toFixed(0)} / ${vh.toFixed(0)}`;
        } else { sceneStages.style.aspectRatio = ''; const c = panMax * ease(seg(len, LA, lenEntry)); svg.setAttribute('viewBox', `${vb0[0]} ${(vb0[1] + c).toFixed(1)} ${vb0[2]} ${vb0[3]}`); }
      }
      lit(len, instant ? 0 : now); pinLogic(now, instant);
      window.__trace = { len, cap, LA, LT, state: gate.dataset.state, headX: pt.x, headY: pt.y, gateX: G.x, gateY: G.y, opn, apv, gOpen, panel4: !panels[3].hasAttribute('data-await'), t: now, lenEntry, lenExit };
      return !instant && (len > 0 && len < LT);
    };
    return rend;
  }

  /* A glowing line: dark edge + saturated gold + white-hot centre, so it stays vivid gold on a pale background as well as a dark one. */
  function glowLine(parent, d, o = {}) {
    const w = o.w || 2.6, mkp = (cls, sw) => mk('path', { class: cls, d, 'stroke-width': sw }, parent);
    const els = [mkp('gl-edge', w + 2.4), mkp('gl-glow', w * 3.6), mkp('gl-core', w), mkp('gl-hot', Math.max(.9, w * .38))];
    const len = els[2].getTotalLength();
    const set = f => { const l = clamp(f) * len; els.forEach(e => { if (l <= .6) e.style.display = 'none'; else { e.style.display = 'inline'; e.style.strokeDasharray = `${l.toFixed(1)} ${(len + 40).toFixed(0)}`; } }); };
    set(0);
    return { els, len, set, point: f => els[2].getPointAtLength(clamp(f) * len) };
  }
  const GLYPHS = [
    'M4.5 4h4.2l10.8 16h-4.2zM19 4l-6.4 7.2M5 20l6.4-7.2',                                              /* X (plain outline mark, not a logo file) */
    'M4 4h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM8 10.5v6M8 7.6v.1M11.5 16.5v-6M11.5 13c0-1.6 1-2.6 2.3-2.6s2.2.9 2.2 2.6v3.5', /* "in" */
    'M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18zM3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18',   /* web / online */
    'M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM3.5 6.5L12 13l8.5-6.5',   /* email */
    'M5 4h12v14a2 2 0 0 0 2 2H7a2 2 0 0 1-2-2zM17 9h3v9a2 2 0 0 1-2 2M8 8h6M8 12h6M8 16h4',               /* newspaper / press */
    'M18 3.4a2.6 2.6 0 1 0 0 5.2a2.6 2.6 0 0 0 0-5.2zM6 9.4a2.6 2.6 0 1 0 0 5.2a2.6 2.6 0 0 0 0-5.2zM18 15.4a2.6 2.6 0 1 0 0 5.2a2.6 2.6 0 0 0 0-5.2zM8.3 10.8l7.4-3.6M8.3 13.2l7.4 3.6'  /* social / share */
  ];

  /* RELEASE: the line arrives, runs along the horizon and into a lamp. The filament flares white-hot but the glass holds it
     (the guardrail). Then it is broadcast: a NEWS FLASH banner sweeps in, rings pulse out, and each channel lights as its line arrives. */
  function release(el) {
    const stage = $('.stage', el), svg = $('svg.art', el);
    let W = 0, H = 0, S = null, rend = null, lp = 0, li = false;
    const BULB = 'M-37 -64C-37 -90 -100 -100 -104 -144A118 118 0 1 1 104 -144C100 -100 37 -90 37 -64';
    const FIL = 'M0 -150L-34 -184L-27 -198L-18 -184L-9 -198L0 -184L9 -198L18 -184L27 -198L34 -184L0 -150';
    function layout() {
      W = Math.max(320, stage.clientWidth); H = Math.max(360, stage.clientHeight);
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.textContent = '';
      const mobile = W < 52 * 16, mg = parseFloat(getComputedStyle(root).getPropertyValue('--page-margin')) || 40;
      const yh = mobile ? Math.round(H * .5) : Math.round(H * .72);
      const sb = mobile ? clamp((yh - 150) / 330, .5, .62) : clamp((yh - 110) / 340, .62, 1);
      const bx = mobile ? W / 2 : Math.max(W * .64, mg + 31 * 16 + 70 + 140);
      const xe = clamp(exitXs == null ? (mobile ? 12 : W * .5) : exitXs, 10, bx - 90);
      const cyb = yh - 200 * sb;
      const defs = mk('defs', {}, svg);
      defs.innerHTML = `<radialGradient id="rl-sun"><stop offset="0" stop-color="#ffe3b8" stop-opacity=".9"/><stop offset=".45" stop-color="#ffb35a" stop-opacity=".4"/><stop offset="1" stop-color="#ff9a3d" stop-opacity="0"/></radialGradient>
        <radialGradient id="rl-glass" cx=".5" cy=".55" r=".6"><stop offset="0" stop-color="#2a2218"/><stop offset=".7" stop-color="#14110e"/><stop offset="1" stop-color="#0c0a08"/></radialGradient>
        <radialGradient id="rl-flash"><stop offset="0" stop-color="#ffffff" stop-opacity="1"/><stop offset=".35" stop-color="#fff0c4" stop-opacity=".92"/><stop offset=".7" stop-color="#ffc864" stop-opacity=".55"/><stop offset="1" stop-color="#ffa43a" stop-opacity="0"/></radialGradient>
        <radialGradient id="rl-bloom"><stop offset="0" stop-color="#ffffff" stop-opacity="1"/><stop offset=".2" stop-color="#ffeec2" stop-opacity="1"/><stop offset=".55" stop-color="#ffbb55" stop-opacity=".6"/><stop offset="1" stop-color="#ff9a3d" stop-opacity="0"/></radialGradient>
        <clipPath id="rl-clip"><circle cx="0" cy="-200" r="116"/></clipPath>
        <filter id="rl-b3" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="3.2"/></filter><filter id="rl-b8" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="8"/></filter>
        <clipPath id="rl-ban"><rect id="rl-banclip" x="0" y="0" width="0" height="80"/></clipPath>`;
      const sun = mk('circle', { id: 'sun', cx: bx, cy: yh + 160, r: Math.min(W, H) * .55, fill: 'url(#rl-sun)' }, svg);
      mk('rect', { class: 'ground', x: -10, y: yh, width: W + 20, height: H - yh + 10 }, svg);
      mk('path', { class: 'horizon', d: `M0 ${yh}H${W}` }, svg);
      /* broadcast rings (behind the lamp) */
      const rings = [0, 1, 2].map(() => mk('circle', { class: 'rl-ring', cx: bx, cy: cyb, r: 10 }, svg));
      /* channel icons, lines from the glass to each */
      const rx = mobile ? W / 2 - 42 : Math.min(340, bx - (mg + 31 * 16 + 74)), ry = mobile ? 118 : 232, ccy = cyb - (mobile ? 6 : 24);
      const ics = GLYPHS.map((g, i) => {
        const th = (188 - i * 35.2) * Math.PI / 180, ix = bx + rx * Math.cos(th), iy = ccy - ry * Math.sin(th), R = mobile ? 21 : 30;
        const dx = ix - bx, dy = iy - cyb, dl = Math.hypot(dx, dy), ux = dx / dl, uy = dy / dl, gr = 118 * sb + 3;
        const sx = bx + ux * gr, sy = cyb + uy * gr, ex = ix - ux * (R + 4), ey = iy - uy * (R + 4);
        const mx = (sx + ex) / 2 - uy * 16, my = (sy + ey) / 2 + ux * 16;
        const ln = glowLine(svg, `M${sx.toFixed(1)} ${sy.toFixed(1)}Q${mx.toFixed(1)} ${my.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`, { w: 1.6 });
        const gI = mk('g', { class: 'rl-ic', transform: `translate(${ix.toFixed(1)} ${iy.toFixed(1)})` }, svg);
        mk('circle', { class: 'rl-ic__halo', r: R + 10 }, gI); mk('circle', { class: 'rl-ic__tile', r: R }, gI);
        const s = R * 1.05 / 12; mk('path', { class: 'rl-ic__glyph', d: g, transform: `scale(${s.toFixed(3)}) translate(-12 -12)`, 'stroke-width': (1.6).toFixed(2) }, gI);
        return { ln, g: gI };
      });
      /* line in: from the top, along the horizon, to the base of the lamp */
      const r = 46;
      const entry = glowLine(svg, `M${xe} -30V${yh - r}Q${xe} ${yh} ${xe + r} ${yh}H${bx - 40}`, { w: 2.6 });
      /* lamp: glass, base, rim glow */
      const lamp = mk('g', { transform: `translate(${bx.toFixed(1)} ${yh}) scale(${sb.toFixed(3)})` }, svg);
      mk('circle', { class: 'rl-rimglow', cx: 0, cy: -200, r: 118, filter: 'url(#rl-b8)' }, lamp);
      mk('path', { class: 'rl-glass', d: BULB + 'Z', fill: 'url(#rl-glass)' }, lamp);
      const inside = mk('g', { 'clip-path': 'url(#rl-clip)' }, lamp);
      const bloom = mk('circle', { cx: 0, cy: -184, r: 10, fill: 'url(#rl-bloom)', style: 'mix-blend-mode:screen' }, inside);
      const flash = mk('circle', { cx: 0, cy: -190, r: 124, fill: 'url(#rl-flash)', opacity: 0, style: 'mix-blend-mode:screen' }, inside);
      const filBlur = mk('path', { class: 'rl-filblur', d: FIL, filter: 'url(#rl-b3)' }, inside);
      mk('path', { class: 'rl-hl', d: 'M-74 -262A92 92 0 0 1 -34 -298' }, lamp);
      mk('path', { class: 'rl-base', d: 'M-37 -64V-12Q-37 0 -24 0H24Q37 0 37 -12V-64M-37 -22H37M-37 -36H37M-37 -50H37' }, lamp);
      mk('path', { class: 'rl-outline', d: BULB }, lamp);
      const feed = glowLine(lamp, 'M0 0V-150', { w: 2.6 / sb });
      const fil = glowLine(lamp, FIL, { w: 2.6 / sb });
      const white = mk('path', { class: 'rl-white', d: FIL, 'stroke-width': 3.4 }, lamp);
      /* news flash banner */
      const bh = mobile ? 34 : 46, by = mobile ? 62 : 66;
      const ban = mk('g', { 'clip-path': 'url(#rl-ban)' }, svg);
      const clipR = $('#rl-banclip', svg); clipR.setAttribute('y', by - 4); clipR.setAttribute('height', bh + 8);
      mk('rect', { class: 'rl-bar', x: 0, y: by, width: W, height: bh }, ban);
      const lw = mobile ? 118 : 156;
      const tk = mk('g', { 'clip-path': 'url(#rl-tkclip)' }, ban);
      defs.insertAdjacentHTML('beforeend', `<clipPath id="rl-tkclip"><rect x="${lw}" y="${by}" width="${W - lw}" height="${bh}"/></clipPath>`);
      const unit = 'BREAKING  \u25C6  NEWS FLASH  \u25C6  ', fs = mobile ? 13 : 16, tkt = mk('text', { class: 'rl-tk', x: lw + 16, y: by + bh / 2 + fs * .36, 'font-size': fs }, tk);
      tkt.textContent = unit.repeat(8);
      const unitW = (() => { tkt.textContent = unit; const w = tkt.getComputedTextLength() || unit.length * fs * .62; tkt.textContent = unit.repeat(8); return w; })();
      mk('rect', { class: 'rl-lab', x: 0, y: by, width: lw, height: bh }, ban);
      const lab = mk('text', { class: 'rl-labt', x: lw / 2, y: by + bh / 2 + fs * .36, 'text-anchor': 'middle', 'font-size': fs }, ban); lab.textContent = 'NEWS FLASH';
      const dot = mk('circle', { class: 'rl-dot', cx: 14, cy: by + bh / 2, r: 3.4 }, ban);
      S = { flash, mobile, yh, sb, bx, cyb, sun, rings, ics, entry, feed, fil, white, bloom, filBlur, lamp, lab, clipR, tkt, unitW, lw, by, bh, W, H, rx, ry };
      S.rim = $('.rl-rimglow', svg); S.outline = $('.rl-outline', svg); S.glass = $('.rl-glass', svg);
      if (rend) rend(lp, li);
    }
    layout();
    mqMobile.addEventListener('change', layout); addEventListener('resize', layout);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
    rend = (p, instant) => {
      lp = p; li = !!instant;
      if (!S || stage.clientWidth !== W || stage.clientHeight !== H) layout();
      const now = performance.now() / 1000, T = instant ? 0 : now;
      const dawn = ease(seg(p, .2, .8));
      stage.style.setProperty('--dawn', dawn.toFixed(3));
      S.sun.setAttribute('cy', (S.yh + 160 - 190 * ease(seg(p, .12, .75))).toFixed(1)); S.sun.style.opacity = (.25 + .75 * seg(p, .05, .6)).toFixed(3);
      /* the line arrives and feeds the lamp */
      const e1 = seg(p, 0, .02), e2 = seg(p, .02, .2);
      const vlen = S.yh + 30 - 46, tot = S.entry.len; S.entry.set(e1 < 1 ? clamp(e1 * vlen / tot) : clamp((vlen + e2 * (tot - vlen)) / tot));
      S.feed.set(seg(p, .2, .28)); S.fil.set(seg(p, .28, .38));
      /* the climax: filament flares white-hot; the glass contains it */
      const fl = ease(seg(p, .38, .5)), fk = instant ? 1 : 1 + .05 * Math.sin(T * 37) + .03 * Math.sin(T * 61 + 1);
      const hot = fl * Math.min(1.08, fk);
      S.white.style.opacity = hot.toFixed(3);
      S.bloom.setAttribute('r', (14 + 104 * fl).toFixed(1)); S.bloom.style.opacity = clamp(hot).toFixed(3);
      S.filBlur.style.opacity = clamp(hot).toFixed(3);
      const fp = seg(p, .40, .54), fo = Math.sin(Math.PI * Math.pow(fp, .8)) * Math.min(1.05, fk);   /* the flash itself: it peaks, then settles to a steady white-hot glow, never leaving the glass */
      S.flash.style.opacity = clamp(fo * .9).toFixed(3);
      S.rim.style.opacity = (.18 + .5 * hot * .9).toFixed(3); S.outline.style.stroke = fl > .02 ? `rgba(255,${Math.round(205 + 40 * fl)},${Math.round(130 + 100 * fl)},${(.55 + .45 * fl).toFixed(2)})` : '';
      /* broadcast: banner sweep, rings, channels */
      const bn = ease(seg(p, .5, .6)); S.clipR.setAttribute('width', (S.W * bn).toFixed(1));
      const tmove = instant ? 0 : (now * 70) % S.unitW; S.tkt.setAttribute('transform', `translate(${(-tmove).toFixed(1)} 0)`);
      S.rings.forEach((rg, i) => {
        const on = seg(p, .5, .56); let ph = instant ? .55 + i * .18 : ((now * .38 + i / 3) % 1);
        const R = 118 * S.sb + ph * Math.min(S.W, S.H) * .52;
        rg.setAttribute('r', R.toFixed(1)); rg.style.opacity = (on * (1 - ph) * .55).toFixed(3);
      });
      S.ics.forEach((ic, i) => { const a = seg(p, .56 + i * .05, .64 + i * .05); ic.ln.set(a); const lit = a >= 1; ic.g.classList.toggle('on', lit); ic.g.style.opacity = (.35 + .65 * (lit ? 1 : a)).toFixed(3); if (lit && !instant) { const fl2 = .9 + .1 * Math.sin(T * 5 + i * 1.7); ic.g.style.setProperty('--ic', fl2.toFixed(3)); } else ic.g.style.setProperty('--ic', '1'); });
      return !instant && p > .38;
    };
    return rend;
  }

  function interlude(el) {
    const isB = el.classList.contains('interlude--b'), svg = $('svg', el);
    const ps = $$('.il', el); ps.forEach(off);
    if (!isB) return p => ps.forEach(e => draw(e, ease(seg(p, .1, .85))));
    /* B: a plain vertical continuation of the line leaving TRACE, drawn down to the bottom edge of the screen, into RELEASE */
    const cores = $$('.tr-core', el), halos = $$('.tr-halo', el);
    let W = 0, H = 0;
    const lay = () => {
      const r = el.getBoundingClientRect(); W = r.width; H = r.height;
      svg.setAttribute('viewBox', `0 0 ${W.toFixed(0)} ${H.toFixed(0)}`);
      const x = clamp(exitXs == null ? W * .3 : exitXs, 8, W - 8);
      [...cores, ...halos].forEach(e => e.setAttribute('d', `M${x.toFixed(1)} -4V${(H + 4).toFixed(1)}`));
    };
    lay(); addEventListener('resize', lay); mqMobile.addEventListener('change', lay);
    return (p, instant) => {
      if (Math.abs(el.getBoundingClientRect().height - H) > 1) lay();
      const r = el.getBoundingClientRect(), l = instant ? H + 8 : clamp(innerHeight - r.top + 24, 0, H + 8);
      [...cores, ...halos].forEach(e => { if (l < 1) e.style.display = 'none'; else { e.style.display = 'inline'; e.style.strokeDasharray = `${l.toFixed(1)} ${H + 40}`; e.style.strokeDashoffset = 4; } });
    };
  }

  const INIT = { isolate, trace, release };
  $$('[data-scene]').forEach(el => scenes.push({ el, render: INIT[el.dataset.scene](el), prog: stageProgress, cur: 0, last: -1, vis: false }));
  $$('.interlude').forEach(el => scenes.push({ el, render: interlude(el), prog: bandProgress, cur: 0, last: -1, vis: false }));

  const vio = new IntersectionObserver(es => es.forEach(e => { const s = scenes.find(x => x.el === e.target); if (s) s.vis = e.isIntersecting; wake(); }), { rootMargin: '10% 0px' });
  scenes.forEach(s => vio.observe(s.el));

  let raf = 0;
  function loop() {
    raf = 0; if (!motionOn()) return;
    let any = false;
    for (const s of scenes) {
      if (!s.vis) continue; any = true;
      const t = s.prog(s.el), d = t - s.cur;
      s.cur = Math.abs(d) < .0004 ? t : s.cur + d * .16;
      if (s.force || Math.abs(s.cur - s.last) > .00005) { s.force = !!s.render(s.cur); s.last = s.cur; }
    }
    if (any) raf = requestAnimationFrame(loop);
  }
  function wake() { if (!raf && motionOn()) raf = requestAnimationFrame(loop); }
  addEventListener('scroll', wake, { passive: true });
  addEventListener('resize', () => { scenes.forEach(s => s.last = -1); wake(); });

  /* ---------- active step (also drives focus of the text) ---------- */
  const sio = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('is-active', e.isIntersecting)), { rootMargin: '-40% 0px -40% 0px' });
  $$('.step').forEach(s => sio.observe(s));

  /* ---------- one-shot reveals ---------- */
  const once = (sel, cls, th) => { const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add(cls); io.unobserve(e.target); } }), { threshold: th }); $$(sel).forEach(n => io.observe(n)); };
  once('.contact', 'is-in', .2);
  once('[data-flow]', 'is-in', .25);
  const hero = $('.hero');
  new IntersectionObserver(es => es.forEach(e => hero.classList.toggle('in-view', e.isIntersecting))).observe(hero);

  /* ---------- hero A: cockpit loop (progressive enhancement over the still) ----------
     A muted, inline, looping <video> is added ~2.6 s after load and fades in over the still (the still is the
     poster frame, so the first frame matches). Paused while the hero is off screen. Skipped for reduced motion,
     motion off, Save-Data or 2g. 1600 px file for wide screens, 960 px for narrow ones; WebM first, MP4 fallback.
     Sound is a separate opt-in: a toggle (shown only while the video is showing) plays a looping ambience bed.
     Sound is OFF on every load and is never started without a click. */
  const heroVid = (() => {
    const POSTER_T = 5.4;                 /* the poster still is the frame at 5.4 s; start there so the fade-in is seamless, then loop 0-10 s */
    let v = null, wanted = false, inView = true, started = false, seekTimer = 0;
    const rm = matchMedia('(prefers-reduced-motion: reduce)');
    const hero = $('.hero'), img = $('.hero__img'), conn = navigator.connection || {};
    const okToLoad = () => root.getAttribute('data-hero') === 'a' && motionOn() && !rm.matches && !conn.saveData && !/2g/.test(conn.effectiveType || '');

    /* ----- sound toggle ----- */
    const sbtn = $('[data-sound-toggle]'), slbl = $('[data-sound-label]');
    let aud = null, soundOn = false;
    function audio() {
      if (aud) return aud;
      aud = document.createElement('audio');
      aud.loop = true; aud.preload = 'none'; aud.volume = 0.5; aud.setAttribute('aria-hidden', 'true'); aud.hidden = true;
      const add = (src, type) => { const e = document.createElement('source'); e.src = src; e.type = type; aud.appendChild(e); };
      add('audio/ambience_loop_10s.opus', 'audio/ogg; codecs=opus'); add('audio/ambience_loop_10s.mp3', 'audio/mpeg');
      aud.addEventListener('error', () => setSound(false), true);
      sbtn.parentNode.appendChild(aud);   /* created only after the first click */
      return aud;
    }
    function paintSound() { if (!sbtn) return; sbtn.setAttribute('aria-pressed', String(soundOn)); slbl.textContent = soundOn ? 'Sound on' : 'Sound off'; }
    function syncAudio() {
      if (!aud) return;
      if (soundOn && inView && !document.hidden) { const p = aud.play(); if (p && p.catch) p.catch(() => setSound(false)); } else aud.pause();
    }
    function setSound(on) {
      soundOn = !!on; paintSound();
      if (soundOn) { audio(); syncAudio(); } else if (aud) { aud.pause(); try { aud.currentTime = 0; } catch (e) {} }
    }
    function showSound() {
      if (!sbtn) return;
      const show = !!(v && v.classList.contains('is-live') && okToLoad());
      sbtn.hidden = !show;
      if (!show && soundOn) setSound(false);
    }
    if (sbtn) {
      sbtn.addEventListener('click', () => setSound(!soundOn));
      document.addEventListener('visibilitychange', syncAudio);
      paintSound();
    }

    /* ----- video ----- */
    function live() { if (v && started && !v.paused) { v.classList.add('is-live'); showSound(); } }
    function create() {
      if (v || !img) return;
      const mob = matchMedia('(max-width: 832px)').matches, base = 'video/hero_v2live_' + (mob ? '960' : '1600') + '_muted';
      v = document.createElement('video');
      v.className = 'hero__img hero__vid'; v.muted = true; v.defaultMuted = true; v.playsInline = true; v.loop = true; v.autoplay = true; v.preload = 'auto';
      v.setAttribute('muted', ''); v.setAttribute('loop', ''); v.setAttribute('playsinline', ''); v.setAttribute('autoplay', '');
      v.setAttribute('aria-hidden', 'true'); v.setAttribute('tabindex', '-1'); v.setAttribute('disablepictureinpicture', ''); v.disablePictureInPicture = true;
      v.width = mob ? 960 : 1600; v.height = mob ? 720 : 1200;
      const add = (src, type) => { const e = document.createElement('source'); e.src = src; e.type = type; v.appendChild(e); };
      add(base + '.webm', 'video/webm; codecs="vp9"'); add(base + '.mp4', 'video/mp4');
      v.addEventListener('loadedmetadata', () => {
        /* start on the poster frame; if the server cannot seek, fall back to starting at 0 after a short wait */
        if (v.duration > POSTER_T + 1) { try { v.currentTime = POSTER_T; } catch (e) {} }
        seekTimer = setTimeout(() => { started = true; live(); }, 1500);
      });
      v.addEventListener('seeked', () => { if (!started) { clearTimeout(seekTimer); started = true; live(); } });
      v.addEventListener('playing', live);
      v.addEventListener('error', () => { if (v) { v.remove(); v = null; showSound(); } }, true);
      img.parentNode.insertBefore(v, img.nextSibling);
    }
    function sync() {
      if (!okToLoad()) { if (v) { v.pause(); v.classList.remove('is-live'); } showSound(); return; }
      create(); if (!v) return;
      if (inView) { const p = v.play(); if (p && p.catch) p.catch(() => {}); } else v.pause();
      syncAudio();
    }
    const start = () => { wanted = true; sync(); };
    new IntersectionObserver(es => es.forEach(e => { inView = e.isIntersecting; if (wanted) sync(); else syncAudio(); })).observe(hero);
    rm.addEventListener && rm.addEventListener('change', sync);
    if (document.readyState === 'complete') setTimeout(start, 2600); else addEventListener('load', () => setTimeout(start, 2600), { once: true });
    return { sync };
  })();

  function applyMotion() {
    heroVid.sync();
    if (motionOn()) { scenes.forEach(s => s.last = -1); wake(); }
    else { scenes.forEach(s => s.render(1, true)); }
  }
  applyCrops(); mqMobile.addEventListener('change', () => { applyCrops(); scenes.forEach(s => s.last = -1); wake(); });
  applyMotion();
  if (motionOn()) wake();
})();
