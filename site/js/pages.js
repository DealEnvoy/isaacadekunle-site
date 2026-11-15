/* Motion toggle for the inner pages. The homepage keeps this behaviour in main.js. */
(() => {
  'use strict';
  const root = document.documentElement;
  const tgl = document.querySelector('[data-motion-toggle]');
  if (!tgl) return;
  const motionOn = () => root.getAttribute('data-motion') !== 'off';
  function sync() {
    const off = !motionOn();
    tgl.setAttribute('aria-pressed', String(off));
    const label = off ? 'Play animations' : 'Pause animations';
    tgl.setAttribute('aria-label', label);
    tgl.title = label;
  }
  tgl.addEventListener('click', () => {
    const next = motionOn() ? 'off' : 'on';
    root.setAttribute('data-motion', next);
    try { localStorage.setItem('motion', next); } catch (e) {}
    sync();
  });
  sync();
})();
