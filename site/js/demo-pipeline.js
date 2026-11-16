/* Simulated TextBackCaller pipeline. No network calls. */
(() => {
  'use strict';
  const roots = document.querySelectorAll('[data-pipeline]');
  if (!roots.length) return;
  const reduce = () => document.documentElement.getAttribute('data-motion') === 'off'
    || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  roots.forEach(root => {
    const buttons = [...root.querySelectorAll('[data-case]')];
    const panels = [...root.querySelectorAll('[data-case-panel]')];
    let timer = 0;

    function play(id) {
      window.clearTimeout(timer);
      buttons.forEach(b => b.setAttribute('aria-pressed', String(b.getAttribute('data-case') === id)));
      panels.forEach(panel => {
        const on = panel.getAttribute('data-case-panel') === id;
        panel.classList.toggle('is-open', on);
        panel.classList.remove('is-done');
        panel.querySelectorAll('[data-step]').forEach(step => step.classList.remove('is-on'));
      });
      const panel = root.querySelector('[data-case-panel="' + id + '"]');
      if (!panel) return;
      const steps = [...panel.querySelectorAll('[data-step]')];
      if (reduce()) {
        steps.forEach(step => step.classList.add('is-on'));
        panel.classList.add('is-done');
        return;
      }
      let i = 0;
      const tick = () => {
        if (!panel.classList.contains('is-open')) return;
        if (i < steps.length) {
          steps[i].classList.add('is-on');
          i += 1;
          timer = window.setTimeout(tick, 420);
        } else {
          panel.classList.add('is-done');
        }
      };
      tick();
    }

    buttons.forEach(button => {
      button.addEventListener('click', () => play(button.getAttribute('data-case')));
    });
  });
})();
