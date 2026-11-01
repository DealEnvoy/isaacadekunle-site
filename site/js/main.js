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
    $$('svg[data-vb-mobile]').forEach(svg => {
      if (!svg.dataset.vbDesktop) svg.dataset.vbDesktop = svg.getAttribute('viewBox');
      svg.setAttribute('viewBox', mqMobile.matches ? svg.dataset.vbMobile : svg.dataset.vbDesktop);
    });
  }

  /* ---------- scenes ---------- */
  const scenes = [];
  const stageProgress = el => { const r = el.getBoundingClientRect(); return clamp(-r.top / Math.max(1, r.height - innerHeight)); };
  const bandProgress = el => { const r = el.getBoundingClientRect(); return clamp((innerHeight - r.top) / (innerHeight + r.height)); };

  /* ISOLATE: a lamp searches a field of marks, the radius narrows, one fault is found, a person gates the exit */
  function isolate(el) {
    const lamp = $('#lamp', el), cam = $('#cam', el), fault = $('#fault', el), arm = $('#gate1arm', el), gate = $('#gate1', el);
    const f = ['f1', 'f2', 'f3'].map(id => [$('#' + id, el), $('#' + id + 'h', el)]);
    const rings = $$('.ring', el), mkAll = $$('.mk', el);
    const path = [[0, 300, 300], [.1, 620, 640], [.2, 960, 260], [.3, 1120, 470]];
    const rad = [[0, 230], [.3, 230], [.38, 560], [.42, 560], [.5, 330], [.54, 330], [.62, 170], [.66, 170], [.76, 60]];
    const at = (k, p) => { let i = 0; while (i < k.length - 2 && p > k[i + 1][0]) i++; const a = k[i], b = k[i + 1]; const t = ease(seg(p, a[0], b[0])); return b.slice(1).map((v, j) => lerp(a[j + 1], v, t)); };
    off(f[0][0]); f.forEach(([c, h]) => { off(c); off(h); });
    return p => {
      const [x, y] = at(path, Math.min(p, .3)), [r] = at(rad, p);
      lamp.setAttribute('cx', x.toFixed(1)); lamp.setAttribute('cy', y.toFixed(1)); lamp.setAttribute('r', r.toFixed(1));
      rings.forEach((rg, i) => rg.style.strokeDashoffset = (1 - seg(p, [.36, .48, .6][i], [.44, .56, .68][i])).toFixed(3));
      [0, 1, 2].forEach(b => { const o = 1 - .85 * seg(p, [.42, .54, .66][b], [.5, .62, .74][b]); mkAll.filter(m => m.dataset.band == b).forEach(m => m.style.opacity = o.toFixed(3)); });
      const s = 1 + (mqMobile.matches ? .22 : .5) * ease(seg(p, .4, .8));
      cam.setAttribute('transform', `translate(1120 470) scale(${s.toFixed(3)}) translate(-1120 -470)`);
      fault.style.opacity = seg(p, .68, .76).toFixed(3);
      draw(f[0][0], seg(p, .72, .84)); draw(f[0][1], seg(p, .72, .84));
      draw(f[1][0], seg(p, .84, .9)); draw(f[1][1], seg(p, .84, .9));
      gate.style.opacity = seg(p, .84, .88).toFixed(3);
      arm.setAttribute('transform', `rotate(${(-78 * ease(seg(p, .9, .95))).toFixed(1)} -34 -4)`);
      draw(f[2][0], seg(p, .94, 1)); draw(f[2][1], seg(p, .94, 1));
    };
  }

  /* TRACE: one filament follows the path through three stages to a human gate, then out */
  function trace(el) {
    const ghost = $('#trail-d', el), core = $('#trail', el), halo = $('#trail-h', el), echoes = $('#echoes', el), st = $('#stations', el), head = $('#head', el), gate = $('#gate2', el), arm = $('#gate2arm', el), hair = $('.hair', el);
    const F = [.18, .38, .58], GATE = .8;
    const desktopD = ghost.getAttribute('d'), mobileD = ghost.dataset.dMobile;
    let stationEls = [], pts = [], gatePt = [0, 0], echo = [];
    function layout() {
      const d = mqMobile.matches ? mobileD : desktopD;
      ghost.setAttribute('d', d); core.setAttribute('d', d); halo.setAttribute('d', d);
      const L = ghost.getTotalLength();
      hair.textContent = ''; for (let i = 0; i < 11; i++) mk('line', { x1: 0, x2: 1600, y1: 40 + i * 82, y2: 40 + i * 82 }, hair);
      st.textContent = ''; echoes.textContent = '';
      pts = F.map(f => ghost.getPointAtLength(f * L));
      stationEls = pts.map(pt => { const g = mk('g', { class: 'st', transform: `translate(${pt.x.toFixed(1)} ${pt.y.toFixed(1)})` }, st); mk('path', { class: 'st__tick', d: 'M0 -34V34' }, g); mk('circle', { class: 'st__ring', r: 11 }, g); return g; });
      const g = ghost.getPointAtLength(GATE * L); gatePt = [g.x, g.y]; gate.setAttribute('transform', `translate(${g.x.toFixed(1)} ${g.y.toFixed(1)})`);
      echo = [[mqMobile.matches ? 70 : 90, 46], [mqMobile.matches ? -60 : -70, -58]].map(([dx, dy]) => mk('path', { class: 'echo', pathLength: 1, d, transform: `translate(${dx} ${dy})` }, echoes));
      return L;
    }
    let L = layout();
    mqMobile.addEventListener('change', () => { L = layout(); });
    const tOf = p => p < .05 ? 0 : p < .72 ? lerp(0, .8, seg(p, .05, .72)) : p < .82 ? .8 : lerp(.8, 1, seg(p, .82, .97));
    return p => {
      const t = tOf(p);
      draw(core, t); draw(halo, t); echo.forEach((e, i) => draw(e, t * (.9 - i * .15) - .06));
      const pt = ghost.getPointAtLength(clamp(t, .001, .999) * L); head.setAttribute('cx', pt.x.toFixed(1)); head.setAttribute('cy', pt.y.toFixed(1)); head.style.opacity = t > 0 && t < .995 ? 1 : 0;
      stationEls.forEach((g, i) => g.classList.toggle('on', t >= F[i]));
      gate.style.opacity = seg(t, .62, .72).toFixed(3);
      arm.setAttribute('transform', `rotate(${(-78 * ease(seg(p, .84, .9))).toFixed(1)} -30 -4)`);
    };
  }

  /* RELEASE: first light. Sky warms, hangar glows, the filament lifts off the horizon in five directions */
  function release(el) {
    const stage = $('.stage', el), sun = $('#sun', el), hangar = $('#hangar', el), lights = $('#rel-lights', el), lifts = $('#lifts', el);
    const ground = $$('.r-ground', el);
    const al = []; for (let i = 0; i < 9; i++) al.push(mk('circle', { class: 'rl', cx: 900 + i * 66, cy: 626, r: 4 - i * .2 }, lights));
    const D = ['M800 640C800 520 700 420 560 300', 'M800 640C840 500 900 380 1000 220', 'M800 640C820 560 940 470 1180 420', 'M800 640C780 560 640 500 440 480', 'M800 640C800 480 800 300 800 130'];
    const ls = D.map(d => { const h = mk('path', { class: 'lift lift--halo', pathLength: 1, d }, lifts), c = mk('path', { class: 'lift lift--core', pathLength: 1, d }, lifts); const e = mk('path', { d }, null); const pt = (() => { const t = mk('path', { d }, lifts); const q = t.getPointAtLength(t.getTotalLength()); t.remove(); return q; })(); const dot = mk('circle', { class: 'lift-end', cx: pt.x, cy: pt.y, r: 6 }, lifts); return [h, c, dot]; });
    ls.forEach(([h, c]) => { off(h); off(c); });
    return p => {
      const dawn = ease(seg(p, .2, .8));
      stage.style.setProperty('--dawn', dawn.toFixed(3));
      sun.setAttribute('cy', (800 - 200 * ease(seg(p, .12, .75))).toFixed(1)); sun.style.opacity = (.25 + .75 * seg(p, .05, .6)).toFixed(3);
      hangar.style.opacity = (seg(p, 0, .12) * (1 - .55 * dawn)).toFixed(3);
      al.forEach((c, i) => c.style.opacity = seg(p, .08 + i * .03, .12 + i * .03).toFixed(2) * (1 - .8 * dawn));
      ground.forEach(g => draw(g, seg(p, .05, .45)));
      ls.forEach(([h, c, dot], i) => { const v = seg(p, .5 + i * .07, .64 + i * .07); draw(h, v); draw(c, v); dot.style.opacity = (v > .98 ? 1 : 0); });
    };
  }

  function interlude(el) {
    const ps = $$('.il', el);
    ps.forEach(off);
    return p => ps.forEach(e => draw(e, ease(seg(p, .1, .85))));
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
      if (Math.abs(s.cur - s.last) > .00005) { s.render(s.cur); s.last = s.cur; }
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

  /* ---------- hero A: night-approach clip (progressive enhancement over the still) ----------
     Plays once, eases to a hold on its last frame. Skipped for reduced motion, motion off or data-saver.
     Paused while the hero is off screen. The still image underneath is always the first frame. */
  const heroVid = (() => {
    let v = null, wanted = false, inView = true;
    const rm = matchMedia('(prefers-reduced-motion: reduce)');
    const img = $('.hero__img'), conn = navigator.connection || {};
    const okToLoad = () => root.getAttribute('data-hero') === 'a' && motionOn() && !rm.matches && !conn.saveData && !/2g/.test(conn.effectiveType || '');
    function create() {
      if (v || !img) return;
      const mob = matchMedia('(max-width: 832px)').matches, base = 'video/approach-' + (mob ? '960' : '1600');
      v = document.createElement('video');
      v.className = 'hero__img hero__vid'; v.muted = true; v.defaultMuted = true; v.playsInline = true; v.preload = 'auto';
      v.setAttribute('aria-hidden', 'true'); v.setAttribute('tabindex', '-1'); v.setAttribute('disablepictureinpicture', ''); v.disablePictureInPicture = true;
      v.width = mob ? 960 : 1600; v.height = mob ? 1200 : 1200;
      const add = (src, type) => { const s = document.createElement('source'); s.src = src; s.type = type; v.appendChild(s); };
      add(base + '.webm', 'video/webm; codecs="vp9"'); add(base + '.mp4', 'video/mp4');
      v.addEventListener('playing', () => v.classList.add('is-live'));
      v.addEventListener('error', () => { if (v) v.remove(); v = null; }, true);
      img.parentNode.insertBefore(v, img.nextSibling);
    }
    function sync() {
      if (!okToLoad()) { if (v) { v.pause(); v.classList.remove('is-live'); } return; }
      create(); if (!v) return;
      if (inView && !v.ended) { const p = v.play(); if (p && p.catch) p.catch(() => {}); } else v.pause();
    }
    const start = () => { wanted = true; sync(); };
    new IntersectionObserver(es => es.forEach(e => { inView = e.isIntersecting; if (wanted) sync(); })).observe(hero);
    rm.addEventListener && rm.addEventListener('change', sync);
    if (document.readyState === 'complete') setTimeout(start, 2600); else addEventListener('load', () => setTimeout(start, 2600), { once: true });
    return { sync };
  })();

  function applyMotion() {
    heroVid.sync();
    if (motionOn()) { scenes.forEach(s => s.last = -1); wake(); }
    else { scenes.forEach(s => s.render(1)); }
  }
  applyCrops(); mqMobile.addEventListener('change', () => { applyCrops(); scenes.forEach(s => s.last = -1); wake(); });
  applyMotion();
  if (motionOn()) wake();
})();
