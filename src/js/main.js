/* isaacadekunle.com V3. Vanilla JS, no dependencies.
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
  const gentle = () => root.hasAttribute('data-gentle');
  const motionOn = () => root.getAttribute('data-motion') !== 'off';

  /* ---------- motion toggle (WCAG 2.2.2) ---------- */
  const tgl = $('[data-motion-toggle]');
  function syncToggle() { const o = !motionOn(); tgl.setAttribute('aria-pressed', String(o)); const t = o ? 'Play animations' : 'Pause animations'; tgl.setAttribute('aria-label', t); tgl.title = t; }
  tgl.addEventListener('click', () => {
    const next = motionOn() ? 'off' : 'on';
    root.setAttribute('data-motion', next);
    try { localStorage.setItem('motion', next); } catch (e) {}
    syncToggle(); applyMotion(true);
  });
  syncToggle();

  /* ---------- mobile art crops ---------- */
  function applyCrops() {
    $$('svg[data-vb-mobile]:not([data-vb-fit])').forEach(svg => {
      if (!svg.dataset.vbDesktop) svg.dataset.vbDesktop = svg.getAttribute('viewBox');
      svg.setAttribute('viewBox', mqMobile.matches ? svg.dataset.vbMobile : svg.dataset.vbDesktop);
    });
  }

  applyCrops(); mqMobile.addEventListener('change', applyCrops);

  /* ---------- scenes ---------- */
  const scenes = [];
  const stageProgress = el => { const r = el.getBoundingClientRect(); return clamp(-r.top / Math.max(1, r.height - innerHeight)); };
  /* same, but runs on below 0 while the stage is still sliding up into view (0 = pinned): TRACE and RELEASE use it so their line keeps travelling during the slide-in instead of waiting for the pin */
  const stageProgressPre = el => { const r = el.getBoundingClientRect(), rg = Math.max(1, r.height - innerHeight); return Math.min(1, Math.max(-innerHeight / rg, -r.top / rg)); };
  const bandProgress = el => { const r = el.getBoundingClientRect(); return clamp((innerHeight - r.top) / (innerHeight + r.height)); };

  /* ISOLATE: a lamp searches a field of marks, the radius narrows, one fault is found, a person gates the exit.
     The marks are small magnets of mixed polarity (spring + damping): the cursor (or, with no cursor or on touch, the lamp and
     the scroll movement) attracts some and repels others. The fault is lit by a thin laser (gradient bloom, no stroke). */
  function isolate(el) {
    const lamp = $('#lamp', el), cam = $('#cam', el), fault = $('#fault', el), arm = $('#gate1arm', el), gate = $('#gate1', el);
    const f = ['f2', 'f3'].map(id => [$('#' + id, el), $('#' + id + 'h', el), $('#' + id + 'g', el)]);
    const trail = $('#lz-trail', el), ltS = [0, 1, 2].map(i => $('#lt-s' + i, el)), ltW = [[...$$('.lt--core', el)], [...$$('.lt--glow', el)], [...$$('.lt--bloom', el)]];
    const rings = $$('.ring', el), mkAll = $$('.mk', el), fade = $('.stage__fade', el), odd = $('#odd', el), oddBar = $('.odd__bar', el), oddGlow = $('.odd__glow', el), oddBloom = $('.odd__bloom', el), faultRing = $('.fault__pulse', el);
    const ODD0 = [154, 78, 58], ODD1 = [255, 236, 200];   /* tarnished red-brown -> lit tungsten */
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
      if (gentle()) t *= .15;                      /* gentle: the same shimmer, slowed so nothing flickers fast */
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
    const physicsOn = () => motionOn();
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
      fault.style.opacity = (instant ? 1 : seg(p, .6, .72)).toFixed(3);
      /* the odd bar: tarnished from the very first frame; as the view closes in on it the other bars dim and it warms, then lights (it is what the laser leaves from) */
      const oL = instant ? 1 : ease(seg(p, .5, .76)), oc = ODD0.map((v, i) => Math.round(lerp(v, ODD1[i], oL)));
      oddBar.style.stroke = `rgb(${oc[0]},${oc[1]},${oc[2]})`; oddBar.style.strokeWidth = (2 + .5 * oL).toFixed(2);
      oddGlow.style.opacity = (.55 * oL).toFixed(3); oddBloom.style.opacity = (.4 * oL).toFixed(3);
      faultRing.setAttribute('r', (instant ? 26 : lerp(70, 26, ease(seg(p, .6, .76)))).toFixed(1));
      if (fade) fade.style.opacity = (instant ? 0 : seg(p, .9, 1)).toFixed(3);
      /* the laser strikes the fault: intensity ramps with scroll, then flickers; the line carries on from the fault */
      strike = seg(p, .72, .78);
      laserLook(strike, now / 1000, instant);
      [0, 1, 2].forEach(i => draw(f[0][i], seg(p, .78, .88)));
      gate.style.opacity = seg(p, .84, .88).toFixed(3);
      arm.setAttribute('transform', `rotate(${(-78 * ease(seg(p, .88, .925))).toFixed(1)} -34 -4)`);
      [0, 1, 2].forEach(i => draw(f[1][i], seg(p, .905, 1)));
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
    const bm = beamKit(svg); bm.add(haloA, coreA); bm.add(haloB, coreB);
    /* the line's head and the lit stations carry the same warm bloom as the beam */
    mk('feGaussianBlur', { stdDeviation: 7 }, mk('filter', { id: 'trHeadGlow', x: '-300%', y: '-300%', width: '700%', height: '700%' }, mk('defs', {}, svg)));
    const headGlow = mk('circle', { class: 'head-glow', r: 14 }, head.parentNode); head.parentNode.insertBefore(headGlow, head);
    const F = [.18, .38, .58], GATE = .8;
    const T_WAIT = 800, T_APPROVE = 600, T_OPEN = 450;      /* ms from the line reaching the closed gate: panel in at 250, she approves 800-1400, gate opens 1400-1850, line moves on */
    const T_PANEL = 250;
    const desktopD = ghost.getAttribute('d'), mobileD = ghost.dataset.dMobile;
    let stationEls = [], pts = [], echo = [], L0 = 1, LA = 1, LB = 1, LT = 2, Rst = [], cap = 1, K = [], G = { x: 0, y: 0 };
    let lStart = 0, len0 = 0, RANGE = 1, PPS = [], DEN = [];   /* lStart: line length when the stage pins; len0: where the line enters the stage top; PPS/DEN: write-up arrival progress and entry distance */
    let bMs = null, lenBase = 1, lenPanEnd = 1, rend = null, lp = 0, li = false, vb0 = [0, 0, 1600, 900], panMax = 0, lenEntry = 1, lenExit = 1, mThr = [], B = null, bParts = [];
    const BW = 560, BH = 660, TIP = 659;   /* building units; TIP = y of the top of the flagpole finial */
    function fitBox() {   /* desktop/tablet: always show the whole path width */
      if (mqMobile.matches) { vb0 = svg.dataset.vbMobile.split(' ').map(Number); }
      else { const asp = innerWidth / Math.max(1, innerHeight), H = Math.max(900, 1480 / asp); vb0 = [60, 450 - H / 2, 1480, H]; }
      svg.setAttribute('viewBox', vb0.join(' ')); svg.__vb0 = vb0.slice();
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
      add('M-12 -552V-572H12V-552M-16 -572H16M0 -572V-650M-5 -654a5 5 0 1 0 10 0a5 5 0 1 0 -10 0', 0, -610);
      add('M-300 0H300', 0, 0);
      return P;
    }
    const bnode = (cls, parent, d) => mk('path', { class: cls, d }, parent);
    function buildBldg() {
      bldg.textContent = ''; bParts = [];
      /* the light fills the building from the top of the flagpole downwards: a vertical gradient mask whose edge follows the line head */
      const defs = mk('defs', {}, bldg);
      defs.innerHTML = '<linearGradient id="bldgmg" gradientUnits="userSpaceOnUse" x1="0" y1="-700" x2="0" y2="80"><stop id="bm0" offset="0" stop-color="#fff"/><stop id="bm1" offset="0" stop-color="#fff"/><stop id="bm2" offset="0" stop-color="#000"/><stop offset="1" stop-color="#000"/></linearGradient><mask id="bldgmask" maskUnits="userSpaceOnUse" x="-420" y="-720" width="840" height="820"><rect x="-420" y="-720" width="840" height="820" fill="url(#bldgmg)"/></mask>';
      bMs = [$('#bm1', bldg), $('#bm2', bldg)];
      const gB = mk('g', {}, bldg), gM = mk('g', { mask: 'url(#bldgmask)' }, bldg), gG = mk('g', { class: 'b-glow-g', filter: 'url(#bldgblur)' }, gM), gO = mk('g', {}, gM);
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
      stationEls = pts.map(pt => { const g = mk('g', { class: 'st', transform: `translate(${pt.x.toFixed(1)} ${pt.y.toFixed(1)})` }, st); mk('path', { class: 'st__tick', d: 'M0 -34V34' }, g); mk('circle', { class: 'st__glow', r: 14 }, g); mk('circle', { class: 'st__ring', r: 11 }, g); return g; });
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
        const gxs = a * G.x + e0, lb = mg + panelW + 106, rb = gxs - 80, bwS = Math.min(.74 * BW, rb - lb), sS = Math.min(bwS / BW, (Hs - 64 - 112) / BH);
        const cxs = (lb + rb) / 2, baseS = Hs - 64;
        /* the camera drops down below the earlier stages so the building stands in clear space (nothing from the path sits behind it) */
        let maxY = 0; for (let l = 0; l <= LA; l += 20) maxY = Math.max(maxY, ghost.getPointAtLength(l).y);
        panMax = maxY + 40 - vb0[1];
        sU = sS / a; bx = (cxs - e0) / a; yb = panMax + (baseS - f0) / a;
        xe = (lb - 70 - e0) / a; exitXs = lb - 70; yEnd = yb + (Hs + 90 - baseS) / a;
      } else {
        const k = a, maxH = Math.max(300, ...mpanels.map(p => p.getBoundingClientRect().height || 0));
        const baseS = clamp(Hs - maxH - 36, 300, 460), sS = Math.min(.5, (baseS - 112) / BH, (W - 90) / BW);
        sU = sS / k; bx = (W / 2 - e0) / k; yb = G.y + 190 / k + TIP * sU; panMax = yb - (baseS - f0) / k;
        xe = (12 - e0) / k; exitXs = 12; yEnd = yb + (Hs - baseS + 90) / a;
      }
      const padU = (mobile ? 30 : 40) / a, yTip = yb - TIP * sU, yA = yTip - padU, yX = yb - 7 * sU;
      const xr = bx + 280 * sU, xl = bx - 280 * sU;
      const rp = (P, R) => {                 /* polyline with rounded corners */
        let d = `M${P[0][0].toFixed(1)} ${P[0][1].toFixed(1)}`;
        for (let i = 1; i < P.length - 1; i++) {
          const [px, py] = P[i - 1], [cx, cy] = P[i], [nx, ny] = P[i + 1], l1 = Math.hypot(cx - px, cy - py), l2 = Math.hypot(nx - cx, ny - cy), r = Math.min(R[i], l1 / 2, l2 / 2);
          d += `L${(cx - (cx - px) / l1 * r).toFixed(1)} ${(cy - (cy - py) / l1 * r).toFixed(1)}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${(cx + (nx - cx) / l2 * r).toFixed(1)} ${(cy + (ny - cy) / l2 * r).toFixed(1)}`;
        }
        const e = P[P.length - 1]; return d + `L${e[0].toFixed(1)} ${e[1].toFixed(1)}`;
      };
      /* gate -> over the top -> straight down the flagpole into the spire tip -> down the axis through dome, pediment, columns and steps -> out along the base -> down into RELEASE */
      const r1 = 56 / a, r2 = 40 / a;
      const dB = rp([[gx, gy], [gx, yA], [bx, yA], [bx, yX], [xe, yX], [xe, yEnd]], [0, r1, r1, r2, r2, 0]);
      ghostB.setAttribute('d', dB); coreB.setAttribute('d', dB); haloB.setAttribute('d', dB);
      LB = ghostB.getTotalLength(); LT = LA + LB;
      lenEntry = LA + lenWhere(ghostB, LB, q => q.y >= yTip - 1);
      lenPanEnd = lenEntry - padU;
      lenBase = LA + lenWhere(ghostB, LB, q => q.y >= yX - 1);
      lenExit = LA + lenWhere(ghostB, LB, q => q.y >= yX - 1 && q.x <= xl);
      B = { bx, yb, sU, yTip, xl, xr };
      bldg.setAttribute('transform', `translate(${bx.toFixed(1)} ${yb.toFixed(1)}) scale(${sU.toFixed(4)})`);
      /* ---- write-up sides ---- */
      const sr = el.getBoundingClientRect(), range = Math.max(1, sr.height - innerHeight);
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
      /* the Stage 4 write-up is pinned (sticky) at the vertical middle of the screen on desktop, beside the gate; on a phone it is docked clear of the line */
      const pyPx = (() => {
        const ph = panels[3].getBoundingClientRect().height || 220;
        return mqMobile.matches ? (steps[3].dataset.side === 'top' ? 66 : Math.max(66, innerHeight - ph - 22)) : clamp(innerHeight / 2 - ph / 2, 70, innerHeight - ph - 24);
      })();
      gstep.style.setProperty('--py', pyPx.toFixed(0) + 'px');
      const topP = s => { const rr = s.getBoundingClientRect(); return clamp((rr.top - sr.top) / range); };
      const centreP = s => { const rr = s.getBoundingClientRect(); return clamp((rr.top - sr.top + rr.height / 2 - innerHeight / 2) / range); };
      const pp = steps.map((s, i) => i === 3 ? clamp((s.getBoundingClientRect().top - sr.top + (parseFloat(getComputedStyle(s).paddingTop) || 0) - pyPx) / range) : centreP(s));   /* write-ups 1-3 are centred in the viewport at pp; write-up 4 reaches its pinned spot at pp, which is when the line reaches the gate */
      const pm = msteps.map(topP);
      /* scroll -> length keyframes; the line is held at the gate until the gate has opened (see render) */
      lStart = Math.max(48, Math.min(Rst[0] - 24, lenWhere(ghost, LA, q => ctm0.d * q.y + f0 >= Hs * .24)));   /* the beam is already on screen (below the fixed header) when the stage pins */
      K = [[0, lStart], [pp[0], Rst[0]], [pp[1], Rst[1]], [pp[2], Rst[2]], [pp[3], cap], [Math.min(pp[3] + .012, pm[0] - .005), cap], [pm[0], lenEntry], [pm[3], lenExit], [Math.max(.995, pm[3] + .01), LT], [1, LT]];
      const kAt = p => { let i = 0; while (i < K.length - 2 && p > K[i + 1][0]) i++; const a1 = K[i], b1 = K[i + 1]; return lerp(a1[1], b1[1], seg(p, a1[0], b1[0])); };
      mThr = pm.map((p, i) => i === 0 ? lenEntry - 2 : kAt(p) - 2);
      len0 = Math.min(lStart - 1, lenWhere(ghost, LA, q => ctm0.d * q.y + f0 >= 0));   /* where the line crosses the top of the stage */
      RANGE = range; PPS = pp;
      { const praw = -sr.top / range;               /* each write-up starts to enter at the bottom edge of the screen DEN px of scroll before the line reaches its marker */
        DEN = panels.map((pn, i) => { const rest = i === 3 ? pyPx : pn.getBoundingClientRect().top - (pp[i] - praw) * range; return Math.max(120, innerHeight - rest); }); }
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
    mpanels.forEach(pn => { pn.removeAttribute('data-await'); pn.style.transition = 'none'; });   /* the governed-method write-ups are scroll-linked too (see mpUpdate), not toggled */
    panels.forEach(pn => { pn.removeAttribute('data-await'); pn.style.transition = 'none'; });   /* write-ups 1-4 are scroll-linked (see rend), not toggled */
    const pin = [0, 0, 0, 0], mop = mpanels.map(() => 0);
    /* 'How a build is governed' and its items: each one rises in from the bottom edge of the screen with the scroll and is fully readable once its top is 36 % of the screen
       height above the bottom edge (well before mid-screen); it dims a little once it passes the upper part. Driven by the panel's own position, so it reverses on scroll-up. */
    const mpUpdate = instant => {
      mpanels.forEach((pn, i) => {
        if (instant || document.documentElement.getAttribute('data-motion') === 'off') { pn.style.opacity = ''; return; }
        const r = pn.getBoundingClientRect(), vh = innerHeight;
        const rise = ease(seg(vh - r.top, 6, vh * .36)), after = .45 * seg(.12 * vh - r.top, 0, .4 * vh);
        mop[i] = rise * (1 - after); pn.style.opacity = mop[i].toFixed(3);
      });
    };
    addEventListener('scroll', () => mpUpdate(false), { passive: true });
    let len = 0, tA = 0, apv = 0, opn = 0, gOpen = false, lastT = 0, gReveal = false, openAt = 0, pinned = false, pinTO = 0;
    const p4 = panels[3];
    const prefersReduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
    /* The pin is only legal while TRACE itself is on screen. The panel is position:fixed, so its own
       rectangle stays mid-viewport after a jump and cannot be used to decide whether the section has gone. */
    const sectionOwnsPin = () => {
      const r = el.getBoundingClientRect();
      return r.bottom > 8 && r.top < innerHeight - 8;
    };
    const dropPin = () => {
      pinned = false;
      clearTimeout(pinTO);
      if (!p4.classList.contains('is-pinned') && !p4.classList.contains('is-leaving')) return;
      p4.classList.remove('is-pinned', 'is-leaving');
      p4.style.removeProperty('--pl');
      p4.style.removeProperty('--pw');
    };
    /* Held beside the gate only while that sequence is playing and TRACE is still the section on screen.
       A fast jump, a scroll back up, a resize, motion off, or reduced motion drops it at once. The old
       420 ms leave timer kept position:fixed after the scene's animation loop had already stopped. */
    const pinLogic = (now, instant) => {
      const py = parseFloat(gstep.style.getPropertyValue('--py')) || 0;
      const nextTop = mpanels[0].getBoundingClientRect().top;
      const nextArrived = nextTop < py + (p4.offsetHeight || 180) + 28;
      const need = !instant && !prefersReduce() && motionOn() && sectionOwnsPin() && gReveal && !nextArrived && (!gOpen || now - openAt < 1800);
      if (need) {
        clearTimeout(pinTO);
        p4.classList.remove('is-leaving');
        if (!pinned) {
          const r = p4.getBoundingClientRect();
          if (Math.abs(r.top - py) > 2) {
            p4.style.setProperty('--pl', r.left + 'px');
            p4.style.setProperty('--pw', r.width + 'px');
            p4.classList.add('is-pinned');
            pinned = true;
          }
        }
      } else if (pinned || p4.classList.contains('is-pinned') || p4.classList.contains('is-leaving')) dropPin();
    };
    const releaseIfGone = () => {
      if (!p4.classList.contains('is-pinned') && !p4.classList.contains('is-leaving')) return;
      if (prefersReduce() || !motionOn() || !sectionOwnsPin()) dropPin();
    };
    addEventListener('scroll', releaseIfGone, { passive: true });
    addEventListener('resize', releaseIfGone);
    matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', releaseIfGone);
    el.__releasePin = dropPin;
    const dash = (c, h, l, total) => { [c, h].forEach(e => { if (l <= .6) e.style.display = 'none'; else { e.style.display = 'inline'; e.style.strokeDasharray = `${l.toFixed(1)} ${(total + 40).toFixed(0)}`; } }); };
    const lit = (len0, now) => {                          /* the building lights from the flagpole tip downwards, following the line head */
      if (!B || !bMs) return;
      const pt = sPoint(len0), hu = (clamp(pt.y, B.yTip - 400, B.yb) - B.yb) / B.sU;
      const yf = (len0 < lenEntry - 1 ? -TIP - 60 : hu) + 80 * ease(seg(len0, lenBase, lenExit + 4));
      const off = y => clamp((y + 700) / 780).toFixed(4);
      bMs[0].setAttribute('offset', off(yf - 36)); bMs[1].setAttribute('offset', off(yf + 8));
      bldg.style.opacity = (1 + (now ? .03 * Math.sin(now / 1000 * 31) : 0)).toFixed(3);
    };
    rend = (p, instant) => {
      lp = p; li = !!instant;
      const now = performance.now(), dt = clamp((now - (lastT || now - 16)) / 1000, .004, .05); lastT = now;
      if (instant) { len = LT; opn = 1; apv = 1; gOpen = true; tA = 0; gReveal = true; }
      else {
        /* below 0 the stage is still sliding up into view: the line keeps travelling from the top edge of the stage to where it stands at the pin, so it never waits for the pin */
        const raw = p < 0 ? lerp(len0, lStart, clamp(1 + p * RANGE / innerHeight)) : tRaw(p);
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
      headGlow.setAttribute('cx', pt.x.toFixed(1)); headGlow.setAttribute('cy', pt.y.toFixed(1)); headGlow.style.opacity = head.style.opacity === '1' ? .85 : 0;
      stationEls.forEach((g, i) => g.classList.toggle('on', len >= Rst[i] - .0005 * L0));
      /* write-ups 1-4: tied to the same progress p that drives the line. Each one sits at its arrival spot (the middle of the screen on desktop) exactly when p reaches
         the keyframe where the line reaches its marker, and slides up from the bottom edge of the screen as p approaches it. It starts to show as it enters at the
         bottom and is fully readable well before it arrives; scrolling back reverses it. */
      panels.forEach((pn, i) => {
        if (instant) { pn.style.opacity = ''; return; }
        const d = (PPS[i] - p) * RANGE;                      /* scroll px still to go before the line reaches this marker */
        const ph = mqMobile.matches, dockTop = ph && steps[i].dataset.side === 'top';   /* on a phone the write-up docks at the bottom or top of the screen, clear of the line; a top-docked one only starts to show in the last stretch so it does not sit over the line head on its way up */
        const rise = ease(1 - seg(d, DEN[i] * (dockTop ? .22 : .42), DEN[i] * (dockTop ? .62 : .98))), after = i < 3 ? (ph ? 1 : .45) * seg(-d, (ph ? .1 : .18) * innerHeight, (ph ? .3 : .5) * innerHeight) : 0;
        pin[i] = rise * (1 - after); pn.style.opacity = pin[i].toFixed(3);
        pn.style.pointerEvents = pin[i] < .5 ? 'none' : '';
      });
      mpUpdate(instant);
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
        } else { sceneStages.style.aspectRatio = ''; const c = panMax * ease(seg(len, LA, lenPanEnd)); svg.setAttribute('viewBox', `${vb0[0]} ${(vb0[1] + c).toFixed(1)} ${vb0[2]} ${vb0[3]}`); }
      }
      lit(len, instant ? 0 : now); pinLogic(now, instant); bm.tick(now / 1000, instant);
      window.__trace = { Rst: Rst.slice(), len, cap, LA, LT, state: gate.dataset.state, headX: pt.x, headY: pt.y, gateX: G.x, gateY: G.y, opn, apv, gOpen, panel4: pin[3] > .5, pin: pin.slice(), mop: mop.slice(), t: now, lenEntry, lenExit };
      return !instant;
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
  /* ---------- ONE shared laser look for every line outside ISOLATE (the ISOLATE beam is the reference) ----------
     white-hot 1.5 px core, a thin amber glow (gaussian blur 2.4 px) and a wide soft bloom (blur 9 px), subtle flicker.
     Each line is a "halo" path (a 4 px source stroke that an SVG filter turns into bloom + glow) plus a 1.5 px core.
     Widths and blur are held in screen px (divided by the live scale). strengths() raises the bloom on pale backgrounds. */
  let bmId = 0;
  function beamKit(svg) {
    const id = ++bmId, defs = mk('defs', {}, svg), kit = { fs: {}, halos: [], cores: [], rims: [], KB: 1.15, KG: .7, rimOp: 0, last: '' };
    const matrix = (r, g, b, a) => `0 0 0 0 ${r} 0 0 0 0 ${g} 0 0 0 0 ${b} 0 0 0 ${a} 0`;
    kit.filter = scale => {
      if (kit.fs[scale]) return kit.fs[scale].url;
      const fid = `bm${id}_${Object.keys(kit.fs).length}`;
      const f = mk('filter', { id: fid, filterUnits: 'userSpaceOnUse', x: -4000, y: -4000, width: 10000, height: 10000, 'color-interpolation-filters': 'sRGB' }, defs);
      const gb = mk('feGaussianBlur', { in: 'SourceAlpha', stdDeviation: 9, result: 'a' }, f), mb = mk('feColorMatrix', { in: 'a', type: 'matrix', values: matrix(1, .604, .239, 1.15), result: 'b' }, f);
      const gg = mk('feGaussianBlur', { in: 'SourceAlpha', stdDeviation: 2.4, result: 'c' }, f), mg = mk('feColorMatrix', { in: 'c', type: 'matrix', values: matrix(1, .757, .42, .7), result: 'd' }, f);
      const m = mk('feMerge', {}, f); mk('feMergeNode', { in: 'b' }, m); mk('feMergeNode', { in: 'd' }, m);
      return (kit.fs[scale] = { url: `url(#${fid})`, gb, mb, gg, mg, scale });
    };
    kit.add = (halo, core, scale = 1, rim) => { halo.setAttribute('filter', kit.filter(scale).url); kit.halos.push({ e: halo, scale }); kit.cores.push({ e: core, scale }); if (rim) kit.rims.push({ e: rim, scale }); };
    kit.strengths = (KB, KG, rimOp) => { kit.KB = KB; kit.KG = KG; kit.rimOp = rimOp || 0; };
    kit.tick = (now, instant) => {
      let k = 1; try { const m = svg.getScreenCTM(); k = ((Math.abs(m.a) + Math.abs(m.d)) / 2) || 1; } catch (e) {}
      const t = (instant ? 0 : now) * (gentle() ? .15 : 1);
      const n = instant ? 0 : .5 * Math.sin(t * 37.1) + .3 * Math.sin(t * 61.7 + 1.3) + .2 * Math.sin(t * 13.3 + .4), fl = Math.min(1, 1 + .06 * n);
      const sig = k.toFixed(4) + '|' + kit.KB + '|' + kit.KG + '|' + kit.halos.length + '|' + kit.rimOp;
      if (sig !== kit.last) {
        kit.last = sig;
        Object.values(kit.fs).forEach(f => { const q = k * f.scale; f.gb.setAttribute('stdDeviation', (9 / q).toFixed(3)); f.gg.setAttribute('stdDeviation', (2.4 / q).toFixed(3)); f.mb.setAttribute('values', matrix(1, .604, .239, kit.KB)); f.mg.setAttribute('values', matrix(1, .757, .42, kit.KG)); });
        kit.halos.forEach(h => h.e.setAttribute('stroke-width', (4 / (k * h.scale)).toFixed(3)));
        kit.cores.forEach(c => c.e.setAttribute('stroke-width', (1.5 / (k * c.scale)).toFixed(3)));
        kit.rims.forEach(r => r.e.setAttribute('stroke-width', (3.6 / (k * r.scale)).toFixed(3)));
      }
      kit.halos.forEach(h => h.e.style.opacity = fl.toFixed(3)); kit.cores.forEach(c => c.e.style.opacity = fl.toFixed(3)); kit.rims.forEach(r => r.e.style.opacity = (kit.rimOp * fl).toFixed(3));
    };
    return kit;
  }
  /* a beam drawn along a path with the same set()/len/point API as glowLine (used for the RELEASE entry line and the feed into the bulb) */
  function beamLine(parent, kit, d, o = {}) {
    const mkp = cls => mk('path', { class: cls, d }, parent);
    const halo = mkp('bm-halo'), rim = o.rim ? mkp('bm-rim') : null, core = mkp('bm-core'), els = [halo, rim, core].filter(Boolean);
    kit.add(halo, core, o.scale || 1, rim);
    const len = core.getTotalLength();
    const set = f => { const l = clamp(f) * len; els.forEach(e => { if (l <= .6) e.style.display = 'none'; else { e.style.display = 'inline'; e.style.strokeDasharray = `${l.toFixed(1)} ${(len + 40).toFixed(0)}`; } }); };
    set(0);
    return { els, len, set, point: f => core.getPointAtLength(clamp(f) * len) };
  }
  /* Overexposed light: a hair-thin near-white core inside stacked, additive golden-white bloom layers (no dark edge, no CSS blur). Same set()/len API as glowLine. */
  function lightLine(parent, d, o = {}) {
    const g = mk('g', { class: 'bl' }, parent), w = o.w || 1.1;
    const lay = [['bl-b5', 44], ['bl-b4', 28], ['bl-b3', 16], ['bl-b2', 8.5], ['bl-b1', 3.8], ['bl-core', w]].map(([c, sw]) => mk('path', { class: c, d, 'stroke-width': sw }, g));
    const len = lay[5].getTotalLength();
    const set = f => { const l = clamp(f) * len; lay.forEach(e => { if (l <= .6) e.style.display = 'none'; else { e.style.display = 'inline'; e.style.strokeDasharray = `${l.toFixed(1)} ${(len + 40).toFixed(0)}`; } }); };
    set(0);
    return { els: lay, g, len, set };
  }
  /* Golden line for the coiled filament: bright gold layers + a white-hot hair core, no dark edge (so it never reads brown). Same set()/len API as glowLine.
     Widths are given in screen px and divided by the lamp scale, so the coil stays crisp on a phone. */
  function coilLine(parent, d, sb) {
    const k = 1 / sb, px = Math.max(.75, Math.min(1, sb * 1.3));
    const lay = [['cl-w', 7.5 * px], ['cl-m', 3.6 * px], ['cl-c', 2.1 * px], ['cl-h', .9 * px]].map(([c, w]) => mk('path', { class: c, d, 'stroke-width': (w * k).toFixed(2) }, parent));
    const len = lay[2].getTotalLength();
    const set = f => { const l = clamp(f) * len; lay.forEach(e => { if (l <= .6) e.style.display = 'none'; else { e.style.display = 'inline'; e.style.strokeDasharray = `${l.toFixed(1)} ${(len + 40).toFixed(0)}`; } }); };
    set(0);
    return { els: lay, len, set, point: f => lay[2].getPointAtLength(clamp(f) * len) };
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
    /* Filament: two support wires rise from the stem junction J to two hook tips, and a tungsten-style helix (side view, slightly tilted so each turn is a
       slanted loop) is strung between them. One continuous path J > left wire > coil > right wire > J, so the line can travel through all of it. */
    const JY = -112, CY = -192, CX = 52, TURNS = 8;
    const COIL = (() => {
      const pts = [], n = TURNS * 30, c = (2 * CX) / (2 * Math.PI * TURNS), a = c * 2.15, b = 10;
      for (let i = 0; i <= n; i++) { const t = i / n * 2 * Math.PI * TURNS; pts.push([-CX + c * t - a * Math.sin(t), CY - b * Math.cos(t)]); }
      return pts;
    })();
    const f1 = v => v.toFixed(2);
    const FIL = 'M0 ' + JY + 'L-7 ' + (JY - 12) + 'L' + f1(COIL[0][0]) + ' ' + f1(COIL[0][1]) + COIL.slice(1).map(q => 'L' + f1(q[0]) + ' ' + f1(q[1])).join('') + 'L7 ' + (JY - 12) + 'L0 ' + JY;
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
        <radialGradient id="rl-glass" cx=".5" cy=".5" r=".6"><stop offset="0" stop-color="#fff6dc" stop-opacity=".07"/><stop offset=".75" stop-color="#ffe9b8" stop-opacity=".05"/><stop offset="1" stop-color="#ffe0a0" stop-opacity=".10"/></radialGradient>
        <radialGradient id="rl-flash"><stop offset="0" stop-color="#ffffff" stop-opacity="1"/><stop offset=".35" stop-color="#fff0c4" stop-opacity=".92"/><stop offset=".7" stop-color="#ffc864" stop-opacity=".55"/><stop offset="1" stop-color="#ffa43a" stop-opacity="0"/></radialGradient>
        <radialGradient id="rl-bloom"><stop offset="0" stop-color="#ffffff" stop-opacity="1"/><stop offset=".2" stop-color="#ffeec2" stop-opacity="1"/><stop offset=".55" stop-color="#ffbb55" stop-opacity=".6"/><stop offset="1" stop-color="#ff9a3d" stop-opacity="0"/></radialGradient>
        <radialGradient id="rl-ig"><stop offset="0" stop-color="#fff6cf" stop-opacity=".95"/><stop offset=".4" stop-color="#ffe08a" stop-opacity=".78"/><stop offset=".65" stop-color="#ffbc40" stop-opacity=".46"/><stop offset=".85" stop-color="#ffa82e" stop-opacity=".16"/><stop offset="1" stop-color="#ffa82e" stop-opacity="0"/></radialGradient>
        <radialGradient id="rl-icf" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fffbe8"/><stop offset=".55" stop-color="#ffeaa0"/><stop offset="1" stop-color="#ffd76a"/></radialGradient>
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
        const ln = lightLine(svg, `M${sx.toFixed(1)} ${sy.toFixed(1)}Q${mx.toFixed(1)} ${my.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`, { w: 1.3 });
        const gI = mk('g', { class: 'rl-ic', transform: `translate(${ix.toFixed(1)} ${iy.toFixed(1)})` }, svg);
        const glow = mk('circle', { class: 'rl-ic__glow', r: R * 2.5, fill: 'url(#rl-ig)', opacity: 0 }, gI); mk('circle', { class: 'rl-ic__halo', r: R + 10 }, gI); mk('circle', { class: 'rl-ic__tile', r: R }, gI); const lit = mk('circle', { class: 'rl-ic__lit', r: R, fill: 'url(#rl-icf)', opacity: 0 }, gI);
        const s = R * 1.05 / 12; const gl = mk('path', { class: 'rl-ic__glyph', d: g, transform: `scale(${s.toFixed(3)}) translate(-12 -12)`, 'stroke-width': (1.6).toFixed(2) }, gI);
        return { ln, g: gI, glow, lit, gl, R };
      });
      /* line in: from the top, along the horizon, to the base of the lamp */
      const r = 46;
      const kit = beamKit(svg);
      const entry = beamLine(svg, kit, `M${xe} -30V${yh - r}Q${xe} ${yh} ${xe + r} ${yh}H${bx - 40}`, { rim: true });
      /* lamp: glass, base, rim glow */
      const lamp = mk('g', { transform: `translate(${bx.toFixed(1)} ${yh}) scale(${sb.toFixed(3)})` }, svg);
      mk('circle', { class: 'rl-rimglow', cx: 0, cy: -200, r: 118, filter: 'url(#rl-b8)' }, lamp);
      mk('path', { class: 'rl-glass', d: BULB + 'Z', fill: 'url(#rl-glass)' }, lamp);
      const inside = mk('g', { 'clip-path': 'url(#rl-clip)' }, lamp);
      const bloom = mk('circle', { cx: 0, cy: CY, r: 10, fill: 'url(#rl-bloom)', style: 'mix-blend-mode:screen' }, inside);
      const flash = mk('circle', { cx: 0, cy: CY - 4, r: 124, fill: 'url(#rl-flash)', opacity: 0, style: 'mix-blend-mode:screen' }, inside);
      const filBlur = mk('path', { class: 'rl-filblur', d: FIL, filter: 'url(#rl-b3)' }, inside);
      mk('path', { class: 'rl-hl', d: 'M-74 -262A92 92 0 0 1 -34 -298' }, lamp);
      mk('path', { class: 'rl-base', d: 'M-37 -64V-12Q-37 0 -24 0H24Q37 0 37 -12V-64M-37 -22H37M-37 -36H37M-37 -50H37' }, lamp);
      mk('path', { class: 'rl-outline', d: BULB }, lamp);
      /* the unlit filament: thin cold tungsten, visible before the line arrives (constant 1.1 px at any zoom) */
      mk('path', { class: 'rl-cold', d: FIL }, lamp);
      const feed = beamLine(lamp, kit, 'M0 0V' + JY, { rim: true, scale: sb });
      const fil = coilLine(lamp, FIL, sb);
      const white = mk('path', { class: 'rl-white', d: FIL, 'stroke-width': Math.max(1.1, 1.5 * sb) / sb }, lamp);
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
      S = { kit, flash, mobile, yh, sb, bx, cyb, sun, rings, ics, entry, feed, fil, white, bloom, filBlur, lamp, lab, clipR, tkt, unitW, lw, by, bh, W, H, rx, ry };
      S.rim = $('.rl-rimglow', svg); S.outline = $('.rl-outline', svg); S.glass = $('.rl-glass', svg);
      if (rend) rend(lp, li);
    }
    layout();
    mqMobile.addEventListener('change', layout); addEventListener('resize', layout);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
    rend = (p, instant) => {
      lp = p; li = !!instant;
      if (!S || stage.clientWidth !== W || stage.clientHeight !== H) layout();
      const now = performance.now() / 1000, T = instant ? 0 : now * (gentle() ? .15 : 1);
      const dawn = ease(seg(p, .2, .8));
      stage.style.setProperty('--dawn', dawn.toFixed(3));
      /* same beam as everywhere else; on the pale dawn sky the bloom is raised and a thin saturated-gold rim sits under the white core so it stays golden */
      S.kit.strengths(1.15 + 1.1 * dawn, .7 + .45 * dawn, .95 * dawn); S.kit.tick(now, instant);
      S.sun.setAttribute('cy', (S.yh + 160 - 190 * ease(seg(p, .12, .75))).toFixed(1)); S.sun.style.opacity = (.25 + .75 * seg(p, .05, .6)).toFixed(3);
      /* the line arrives and feeds the lamp */
      /* the line is already coming down while the stage slides up into view (p < 0, 0 = pinned): it reaches 30% of the way down the stage at the pin, then carries on down to the horizon and along it */
      const vlen = S.yh + 30 - 46, tot = S.entry.len, pre = Math.min(vlen, .3 * S.H), rg = Math.max(1, el.getBoundingClientRect().height - innerHeight);
      const e1 = seg(p, 0, .09), e2 = seg(p, .09, .2), u = clamp(1 + Math.min(0, p) * rg / innerHeight);
      S.entry.set(instant ? 1 : p < 0 ? clamp(u * pre / tot) : e1 < 1 ? clamp(lerp(pre, vlen, e1) / tot) : clamp((vlen + e2 * (tot - vlen)) / tot));
      window.__rel = { p, entryPx: Math.round(tot * clamp(instant ? 1 : p < 0 ? u * pre / tot : e1 < 1 ? lerp(pre, vlen, e1) / tot : (vlen + e2 * (tot - vlen)) / tot)), vlen: Math.round(vlen), pre: Math.round(pre) };
      S.feed.set(seg(p, .2, .28)); S.fil.set(seg(p, .28, .38));
      /* the climax: filament flares white-hot; the glass contains it */
      const fl = ease(seg(p, .38, .5)), fk = instant ? 1 : 1 + .05 * Math.sin(T * 37) + .03 * Math.sin(T * 61 + 1);
      const hot = fl * Math.min(1.08, fk);
      S.white.style.opacity = hot.toFixed(3);
      S.bloom.setAttribute('r', (14 + 104 * fl).toFixed(1)); S.bloom.style.opacity = clamp(hot).toFixed(3);
      S.filBlur.style.opacity = clamp(hot).toFixed(3);
      const fp = seg(p, .40, .54), fo = Math.sin(Math.PI * Math.pow(fp, .8)) * Math.min(1.05, fk);   /* the flash itself: it peaks, then settles to a steady white-hot glow, never leaving the glass */
      S.flash.style.opacity = clamp(fo * .9).toFixed(3);
      S.rim.style.opacity = (.18 + .5 * hot * .9).toFixed(3); S.outline.style.stroke = fl > .02 ? `rgba(236,${Math.round(190 + 20 * fl)},${Math.round(104 + 40 * fl)},${(.27 + .12 * fl).toFixed(2)})` : '';
      /* broadcast: banner sweep, rings, channels */
      const bn = ease(seg(p, .5, .6)); S.clipR.setAttribute('width', (S.W * bn).toFixed(1));
      const tmove = instant ? 0 : (now * (gentle() ? 36 : 70)) % S.unitW; S.tkt.setAttribute('transform', `translate(${(-tmove).toFixed(1)} 0)`);
      S.rings.forEach((rg, i) => {
        const on = seg(p, .5, .56); let ph = instant ? .55 + i * .18 : ((now * .38 + i / 3) % 1);
        const R = 118 * S.sb + ph * Math.min(S.W, S.H) * .52;
        rg.setAttribute('r', R.toFixed(1)); rg.style.opacity = (on * (1 - ph) * .55).toFixed(3);
      });
      S.ics.forEach((ic, i) => {
        /* Each icon is dark until ITS line tip arrives: lighting is derived from the line's own progress (a), never a separate timer. */
        const s0 = .56 + i * .05, a = seg(p, s0, s0 + .08), ig = seg(p, s0 + .08, s0 + .115);
        ic.ln.set(a); ic.ln.g.style.opacity = instant ? '1' : (.94 + .06 * Math.sin(T * 41 + i * 2.3) + .03 * Math.sin(T * 67 + i)).toFixed(3);
        /* lit: luminous warm-gold disc with a deep-amber glyph; the bloom halo pulses (about 1.4 s loop, ~3.2 s under OS reduce) */
        const pw = instant ? 1 : .5 + .5 * Math.sin(now * (gentle() ? 1.96 : 4.49) + i * 1.7);
        ic.g.classList.toggle('on', ig > .02); ic.g.style.opacity = (.55 + .45 * ig).toFixed(3);
        ic.g.style.setProperty('--ic', (ig * (.6 + .4 * pw)).toFixed(3));
        ic.lit.setAttribute('opacity', ig.toFixed(3));
        ic.gl.style.stroke = `rgb(${Math.round(143 - 21 * ig)},${Math.round(136 - 62 * ig)},${Math.round(122 - 122 * ig)})`;
        ic.glow.setAttribute('r', (ic.R * (instant ? 2.45 : 2.05 + .6 * pw)).toFixed(1));
        ic.glow.setAttribute('opacity', (ig * (instant ? .95 : .55 + .45 * pw)).toFixed(3));
      });
      return !instant && p > .38;
    };
    return rend;
  }

  /* INTERLUDE A joins the ISOLATE beam to the TRACE line. It is one continuous beam: it starts inside the ISOLATE stage (OV px above the stage's bottom edge,
     exactly on top of the ISOLATE trail, so there is no cut at the section boundary), follows the same curve out of the stage, then bends to the exact x
     where the TRACE line enters. INTERLUDE B continues the TRACE exit line down into RELEASE. Both use the shared beam look. */
  const OV = 150;
  function interlude(el) {
    const isB = el.classList.contains('interlude--b'), svg = $('svg', el);
    const halos = $$('.tr-halo', el), cores = $$('.tr-core', el), bm = beamKit(svg);
    halos.forEach((h, i) => bm.add(h, cores[i]));
    let W = 0, H = 0, ovNow = 0;
    if (!isB) {
      const isoEl = $('#isolate'), isoStage = $('.stage', isoEl), isoSvg = $('svg.art', isoEl), f3 = $('#f3', isoEl), trEl = $('#trace'), trSvg = $('svg.art', trEl), trGhost = $('#trail-d', trEl);
      const halo = halos[0], core = cores[0];
      let pts = [], lens = [], lenPoly = 0, Lq0 = 0, Lf3 = 1, total = 1, sig = '', prefix = 0;
      const lay = () => {
        const r = el.getBoundingClientRect(); W = r.width; H = r.height;
        ovNow = motionOn() ? OV : 0; el.style.setProperty('--ov', ovNow + 'px');
        svg.setAttribute('viewBox', `0 0 ${W.toFixed(0)} ${(H + ovNow).toFixed(0)}`);
        /* 1. the ISOLATE trail (f3) as it stands at the end of the scene (camera at its final zoom), in px relative to the stage's bottom edge */
        const sRect = isoStage.getBoundingClientRect(), M = isoSvg.getScreenCTM(), mobile = mqMobile.matches, se = 1 + (mobile ? .22 : .5);
        const raw = f3.getTotalLength(); Lf3 = raw;
        const toS = q => { const x = 1120 + (q.x - 1120) * se, y = 470 + (q.y - 470) * se; return [M.a * x + M.e - sRect.left, M.d * y + M.f - sRect.bottom]; };
        const all = []; for (let l = 0; l <= raw; l += 3) { const q = toS(f3.getPointAtLength(l)); all.push([q[0], q[1], l]); }
        let cross = all.findIndex(q => q[1] >= 0); if (cross < 1) cross = all.length - 1;
        const a0 = all[cross - 1], a1 = all[cross], tcr = (0 - a0[1]) / ((a1[1] - a0[1]) || 1);
        const cp = [lerp(a0[0], a1[0], tcr), 0, lerp(a0[2], a1[2], tcr)];
        const keep = all.slice(0, cross).filter(q => q[1] >= -ovNow); pts = keep.map(q => [q[0], q[1] + ovNow]); Lq0 = keep.length ? keep[0][2] : cp[2];
        /* where the f3 trail starts inside the overlap, the beam above it is the straight ISOLATE beam: carry it up vertically to the top of the overlap */
        prefix = 0; if (pts.length && pts[0][1] > 1) { prefix = pts[0][1]; pts.unshift([pts[0][0], 0]); }
        pts.push([cp[0], ovNow]);
        let tx = a1[0] - a0[0], ty = a1[1] - a0[1]; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl; if (ty < .3) { ty = Math.max(.3, ty); const n2 = Math.hypot(tx, ty); tx /= n2; ty /= n2; }
        /* 2. where TRACE picks the line up: screen x of its path where it enters the stage top */
        /* where the TRACE line enters at the top of its stage: worked out from the stage's RESTING camera (its base viewBox), never the live
           one, because TRACE pans its camera with scroll and a page opened on a #hash (or a resize while scrolled down) would otherwise
           read the panned view and send the interlude to the wrong side of the screen */
        const tr = trSvg.getBoundingClientRect(); let xt = W / 2;
        let vbR = trSvg.__vb0; if (!vbR || !motionOn()) vbR = (trSvg.getAttribute('viewBox') || '0 0 1600 900').trim().split(/\s+/).map(Number);
        if (tr.width > 0 && tr.height > 0 && vbR && vbR[2] > 0) {
          const sc = Math.max(tr.width / vbR[2], tr.height / vbR[3]), ox = (tr.width - vbR[2] * sc) / 2 - vbR[0] * sc, oy = (tr.height - vbR[3] * sc) / 2 - vbR[1] * sc;
          for (let l = 0, T = trGhost.getTotalLength(); l <= T; l += 1) { const q = trGhost.getPointAtLength(l); if (sc * q.y + oy >= 0) { xt = sc * q.x + ox; break; } }
        }
        /* 3. smooth bend (same tangent as the ISOLATE beam where it leaves the stage, vertical where it meets TRACE) */
        const x0 = cp[0], y0 = ovNow, y1 = H + ovNow, dy = y1 - y0, c1 = [x0 + tx * dy * .45, y0 + ty * dy * .45], c2 = [xt, y1 - dy * .4];
        let d = 'M' + pts.map(q => q[0].toFixed(2) + ' ' + q[1].toFixed(2)).join('L') + `C${c1[0].toFixed(2)} ${c1[1].toFixed(2)} ${c2[0].toFixed(2)} ${c2[1].toFixed(2)} ${xt.toFixed(2)} ${y1.toFixed(2)}V${(y1 + 6).toFixed(2)}`;
        [halo, core].forEach(e => e.setAttribute('d', d));
        total = core.getTotalLength(); lenPoly = 0; for (let i = 1; i < pts.length; i++) lenPoly += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
        lens = []; for (let l = 0; l <= total; l += 6) lens.push(core.getPointAtLength(l).y);
        sig = [innerWidth, innerHeight, ovNow, mobile, sRect.height, tr.width, H].join('|');
      };
      const dashSet = l => [halo, core].forEach(e => { if (l <= .6) e.style.display = 'none'; else { e.style.display = 'inline'; e.style.strokeDasharray = `${l.toFixed(1)} ${(total + 40).toFixed(0)}`; } });
      const sigNow = () => [innerWidth, innerHeight, motionOn() ? OV : 0, mqMobile.matches, isoStage.getBoundingClientRect().height, trSvg.getBoundingClientRect().width, (trSvg.__vb0 || []).join(','), el.getBoundingClientRect().height].join('|');
      lay(); addEventListener('resize', lay); mqMobile.addEventListener('change', lay); if (document.fonts && document.fonts.ready) document.fonts.ready.then(lay);
      return (p, instant) => {
        if (sigNow() !== sig) lay();
        const isoScene = scenes.find(x => x.el === isoEl), pIso = isoScene && isoScene.vis ? isoScene.cur : stageProgress(isoEl)   /* ISOLATE only eases while on screen; after a jump (nav link, #hash, fast scroll) its eased value is stale, so use the real scroll position */, d = instant ? 1 : seg(pIso, .905, 1);
        let l;
        if (instant) l = total + 8;
        else if (d < 1) l = d <= 0 ? 0 : clamp(prefix + Math.max(0, d * Lf3 - Lq0), 0, lenPoly);
        else {
          const r = el.getBoundingClientRect(), yTarget = innerHeight - r.top + 24 + ovNow; let i = 0; while (i < lens.length - 1 && lens[i] < yTarget) i++;
          l = clamp(Math.max(lenPoly, Math.min(total + 8, i * 6)), 0, total + 8);
        }
        dashSet(l); bm.tick(performance.now() / 1000, instant);
        return !instant;
      };
    }
    /* B: a plain vertical continuation of the line leaving TRACE, drawn down to the bottom edge of the screen, into RELEASE */
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
      bm.tick(performance.now() / 1000, instant);
      return !instant;
    };
  }

  const INIT = { isolate, trace, release };
  /* Build a scene's SVG when it is actually on screen, not during the first script task. A hash landing still builds at once, because wake() runs below when location.hash is set. */
  $$('[data-scene]').forEach(el => scenes.push({ el, build: () => INIT[el.dataset.scene](el), render: null, prog: el.dataset.scene === 'isolate' ? stageProgress : stageProgressPre, cur: 0, last: -1, vis: false }));
  $$('.interlude').forEach(el => scenes.push({ el, build: () => interlude(el), render: null, prog: bandProgress, cur: 0, last: -1, vis: false }));

  const vio = new IntersectionObserver(es => es.forEach(e => { const s = scenes.find(x => x.el === e.target); if (s) s.vis = e.isIntersecting; wake(); }), { rootMargin: '10% 0px' });
  scenes.forEach(s => vio.observe(s.el));

  let raf = 0;
  function loop() {
    raf = 0; if (!motionOn()) return;
    let any = false;
    const calm = gentle();
    for (const s of scenes) {
      if (!s.vis) { if (s.el.__releasePin) s.el.__releasePin(); continue; }
      any = true;
      if (!s.render) s.render = s.build();
      const t = s.prog(s.el), d = t - s.cur;
      s.cur = calm || Math.abs(d) < .0004 ? t : s.cur + d * .16;
      if (s.force || Math.abs(s.cur - s.last) > .00005) { s.force = !!s.render(s.cur, false); s.last = s.cur; }
    }
    /* Reduced motion still follows the scroll, but it does not keep a frame loop alive after the position has been applied. */
    if (any && !calm) raf = requestAnimationFrame(loop);
  }
  function wake() { if (!raf && motionOn()) raf = requestAnimationFrame(loop); }
  addEventListener('scroll', wake, { passive: true });
  addEventListener('resize', () => { scenes.forEach(s => s.last = -1); wake(); });
  function goHash() {
    const id = (location.hash || '').slice(1);
    const target = id && document.getElementById(id);
    if (!target) return;
    scenes.forEach(s => { if (s.el.__releasePin) s.el.__releasePin(); });
    const top = target.getBoundingClientRect().top + scrollY - 72;
    scrollTo({ top: Math.max(0, top), behavior: 'instant' });
    wake();
  }
  addEventListener('hashchange', goHash);

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
     Sound: a toggle (shown only while the video is showing) plays a looping ambience bed. It is on by default and remembered; the browser
     starts it on the first user gesture. */
  const heroVid = (() => {
    const POSTER_T = 5.4;                 /* the poster still is the frame at 5.4 s; start there so the fade-in is seamless, then loop 0-10 s */
    let v = null, wanted = false, inView = true, started = false, seekTimer = 0;
    const rm = matchMedia('(prefers-reduced-motion: reduce)');
    const hero = $('.hero'), img = $('.hero__img'), conn = navigator.connection || {};
    const okToLoad = () => root.getAttribute('data-hero') === 'a' && motionOn() && !conn.saveData && !/2g/.test(conn.effectiveType || '');

    /* ----- sound toggle ----- */
    const sbtn = $('[data-sound-toggle]'), slbl = $('[data-sound-label]');
    /* Sound: the PREFERENCE defaults to on (localStorage 'sound' = 'off' turns it off for good). The button never shows the preference, it shows what is
       ACTUALLY happening: "Sound off" (aria-pressed=true) only while the ambience is audibly playing, otherwise "Sound on" (aria-pressed=false).
       The label follows the audio element's own play / playing / pause / ended / error events. Browsers refuse audible playback before a user gesture,
       so if the first play() on load is blocked, the bed starts on the first click / tap / key press anywhere (scrolling alone is not a gesture).
       Clicking the button while it says "Sound on" is itself a gesture and starts the audio at once. */
    let aud = null, want = true;
    try { want = localStorage.getItem('sound') !== 'off'; } catch (e) {}
    const isPlaying = () => !!aud && !aud.paused && !aud.ended && !aud.muted && aud.volume > 0 && aud.readyState >= 3;
    function paintSound() { if (!sbtn) return; const on = isPlaying(), t = on ? 'Sound off' : 'Sound on'; sbtn.setAttribute('aria-pressed', String(on)); sbtn.setAttribute('aria-label', t); slbl.textContent = t; }
    function audio() {
      if (aud) return aud;
      aud = document.createElement('audio');
      aud.loop = true; aud.preload = 'auto'; aud.muted = false; aud.volume = 0.5; aud.setAttribute('aria-hidden', 'true'); aud.hidden = true;
      const add = (src, type) => { const e = document.createElement('source'); e.src = src; e.type = type; aud.appendChild(e); };
      add('audio/ambience_loop_10s.opus', 'audio/ogg; codecs=opus'); add('audio/ambience_loop_10s.mp3', 'audio/mpeg');
      ['playing', 'pause', 'ended', 'emptied', 'error', 'waiting', 'stalled', 'volumechange'].forEach(ev => aud.addEventListener(ev, paintSound, true));
      sbtn.parentNode.appendChild(aud);
      return aud;
    }
    const canPlay = () => !!sbtn && !sbtn.hidden && inView && !document.hidden;
    function tryPlay() {                                   /* resolves quietly; the label only changes via the audio events */
      if (!want || !canPlay()) { if (aud && !aud.paused) aud.pause(); paintSound(); return; }
      const a = audio(), p = a.play();
      if (p && p.catch) p.catch(() => { paintSound(); });  /* blocked (NotAllowedError) or interrupted: stays "Sound on", retried on the next gesture */
      paintSound();
    }
    const syncAudio = tryPlay;
    function showSound() {
      if (!sbtn) return;
      sbtn.hidden = !(v && v.classList.contains('is-live') && okToLoad());
      tryPlay();
    }
    if (sbtn) {
      sbtn.addEventListener('click', () => {
        if (isPlaying()) { want = false; try { localStorage.setItem('sound', 'off'); } catch (e) {} if (aud) { aud.pause(); try { aud.currentTime = 0; } catch (e) {} } paintSound(); }
        else { want = true; try { localStorage.setItem('sound', 'on'); } catch (e) {} tryPlay(); }
      });
      document.addEventListener('visibilitychange', syncAudio);
      /* first user gesture anywhere (not on the toggle itself, which handles its own click) starts the bed if the preference is on and it is not playing */
      const unlock = e => { if (want && !isPlaying() && !sbtn.contains(e.target)) tryPlay(); };
      ['pointerdown', 'pointerup', 'touchend', 'keydown', 'click'].forEach(ev => addEventListener(ev, unlock, { passive: true, capture: true }));
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
    /* iOS Low Power Mode blocks autoplay: retry on the first touch / scroll / key */
    const retry = () => { if (v && v.paused && inView && okToLoad()) { const p = v.play(); if (p && p.catch) p.catch(() => {}); } };
    ['touchstart', 'pointerdown', 'scroll', 'keydown'].forEach(ev => addEventListener(ev, retry, { passive: true }));
    document.addEventListener('visibilitychange', () => { if (!document.hidden) retry(); });
    const start = () => { wanted = true; sync(); };
    new IntersectionObserver(es => es.forEach(e => { inView = e.isIntersecting; if (wanted) sync(); else syncAudio(); })).observe(hero);
    rm.addEventListener && rm.addEventListener('change', sync);
    if (document.readyState === 'complete') setTimeout(start, 2600); else addEventListener('load', () => setTimeout(start, 2600), { once: true });
    return { sync };
  })();

  /* ---------- Guided tour: rAF-driven auto-scroll (never on load) ----------
     Starts from "Start a conversation" / "Play tour", or once per visit when the visitor scrolls down to ISOLATE.
     Stops at once on any user input; never auto-starts under prefers-reduced-motion or with motion off. */
  const tour = (() => {
    const stopBtn = $('[data-tour-stop]'), isoEl = $('#isolate'), contactEl = $('#contact'), dawnEl = $('.dawn'), relEl = $('#release');
    if (!stopBtn || !isoEl || !contactEl) return null;
    const rmq = matchMedia('(prefers-reduced-motion: reduce)');
    const reduced = () => rmq.matches || !motionOn();
    const top = el => el.getBoundingClientRect().top + scrollY;
    let running = false, raf = 0, y = 0, speed = 0, last = 0, expected = 0, graceUntil = 0, startedAt = 0, endY = 0, zones = null, autoUsed = false, lastInput = -1e9, touching = 0, pending = false, suppress = false, idleT = 0, prevY = scrollY;
    const hdr = () => parseFloat(getComputedStyle(root).scrollPaddingTop) || 64;
    function plan() {
      const vh = innerHeight, maxY = Math.max(0, document.documentElement.scrollHeight - vh);
      endY = Math.min(maxY, Math.max(0, top(contactEl) - hdr()));
      const iso = top(isoEl), rel = relEl ? top(relEl) : iso, dawn = dawnEl ? top(dawnEl) : endY;
      /* px/s relative to the viewport height: hero and strip a little quicker, scroll-driven scenes slow and steady, copy bands quicker again */
      zones = { iso, dawn, vHero: .18 * vh, vScene: .126 * vh, vBand: .20 * vh };
      return zones;
    }
    const target = yy => (yy < zones.iso - 40 ? zones.vHero : yy < zones.dawn ? zones.vScene : zones.vBand);
    function frame(now) {
      if (!running) return;
      raf = requestAnimationFrame(frame);
      const dt = Math.min(.05, Math.max(.001, (now - last) / 1000)); last = now;
      /* something other than the tour moved the page (scrollbar drag, find-in-page, anchor jump): hand control back */
      if (now > graceUntil && Math.abs(scrollY - expected) > 8) { stop('external'); return; }
      if (now <= graceUntil && Math.abs(scrollY - expected) > 8) y = Math.max(y, scrollY);   /* wheel momentum after a scroll-started tour */
      const left = endY - y;
      const want = Math.min(target(y), 30 + Math.max(0, left) * 1.1);                       /* ease out into Contact */
      speed += (want - speed) * Math.min(1, dt * 2.2);                                        /* ease in from standstill */
      y = Math.min(endY, y + speed * dt);
      expected = y; scrollTo(0, y);
      if (endY - y < 1.5) { scrollTo(0, endY); stop('done'); }
    }
    function begin(fromScroll) {
      if (running || reduced()) return false;
      plan(); y = scrollY; if (endY - y < 4) return false;
      running = true; speed = 0; last = performance.now(); startedAt = last; expected = y;
      graceUntil = fromScroll ? last + 900 : last;
      root.style.scrollBehavior = 'auto';   /* the page CSS uses smooth; each rAF step must land instantly */
      root.setAttribute('data-touring', '');
      stopBtn.hidden = false;
      raf = requestAnimationFrame(frame);
      return true;
    }
    function stop(why) {
      if (!running) return;
      running = false; cancelAnimationFrame(raf);
      root.style.scrollBehavior = ''; root.removeAttribute('data-touring');
      stopBtn.hidden = true; root.setAttribute('data-tour-last', why);
      if (why === 'done') { try { scrollTo(0, endY); } catch (e) {} }
    }
    /* any user input stops the tour (a few ms of grace after starting so the click that started it is not counted) */
    const onInput = e => {
      lastInput = performance.now();
      if (!running) return;
      const t = lastInput;
      if (e.type === 'wheel' && t < graceUntil) return;
      if (e.type === 'keydown' && (t - startedAt < 400 || ['Shift', 'Control', 'Alt', 'Meta'].includes(e.key))) return;
      if ((e.type === 'pointerdown' || e.type === 'mousedown') && e.target.closest && e.target.closest('[data-tour-play]') && t - startedAt < 400) return;
      stop('input:' + e.type);
    };
    ['wheel', 'touchstart', 'touchmove', 'keydown', 'pointerdown', 'mousedown'].forEach(ev => addEventListener(ev, onInput, { passive: true, capture: true }));
    addEventListener('touchstart', () => { touching++; }, { passive: true, capture: true });
    ['touchend', 'touchcancel'].forEach(ev => addEventListener(ev, () => { touching = Math.max(0, touching - 1); lastInput = performance.now(); if (pending && !touching) { pending = false; setTimeout(() => { if (!autoUsed) { autoUsed = true; begin(true); } }, 120); } }, { passive: true, capture: true }));
    stopBtn.addEventListener('click', () => stop('button'));
    /* nav links: stop, then navigate normally (and do not treat that arrival at ISOLATE as a manual scroll) */
    $$('a[href^="#"]').forEach(a => { if (!a.hasAttribute('data-tour-play')) a.addEventListener('click', () => { stop('nav'); suppress = true; }); });
    /* the two hero buttons */
    $$('[data-tour-play]').forEach(a => a.addEventListener('click', e => {
      if (reduced()) return;                 /* plain anchor jump */
      e.preventDefault(); stop('restart'); autoUsed = true;
      history.replaceState && history.replaceState(null, '', location.pathname + location.search);
      begin(false);
    }));
    /* manual scroll down to ISOLATE starts it once per visit */
    addEventListener('scroll', () => {
      const yy = scrollY, py = prevY; prevY = yy;
      clearTimeout(idleT); idleT = setTimeout(() => { suppress = false; }, 260);
      if (running || autoUsed || suppress || reduced() || document.hidden) return;
      if (performance.now() - lastInput > 3000) return;   /* only scrolling the visitor is doing (wheel, touch, keys, scrollbar), not restoration */
      const iso = top(isoEl), trig = iso - .15 * innerHeight;
      if (py < trig && yy >= trig && yy < trig + .6 * innerHeight) {
        if (touching) pending = true; else { autoUsed = true; begin(true); }
      }
    }, { passive: true });
    rmq.addEventListener && rmq.addEventListener('change', () => { if (reduced()) stop('reduced'); });
    return { begin, stop, get running() { return running; } };
  })();
  window.__tour = tour && { get running() { return tour.running; }, stop: () => tour.stop('api') };

  function applyMotion(fromToggle) {
    heroVid.sync();
    if (motionOn()) { scenes.forEach(s => s.last = -1); if (fromToggle || location.hash) wake(); }
    else scenes.forEach(s => { if (s.render) s.render(1, true); if (s.el.__releasePin) s.el.__releasePin(); });
  }
  applyCrops(); mqMobile.addEventListener('change', () => { applyCrops(); scenes.forEach(s => s.last = -1); wake(); });
  applyMotion(false);
  /* The browser scrolls to a hash before the scenes have their height. Repeat the jump after layout. */
  if (location.hash) {
    goHash();
    addEventListener('load', goHash);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(goHash);
  }
})();
