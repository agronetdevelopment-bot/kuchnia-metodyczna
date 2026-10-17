// Kuchnia Metodyczna — small interactions
document.addEventListener('DOMContentLoaded', () => {
  // Mobile menu
  const header = document.querySelector('.site-header');
  const toggle = document.querySelector('.menu-toggle');
  if (toggle) {
    toggle.addEventListener('click', () => {
      const open = header.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
  }

  // "Czytaj więcej" on bios (mobile)
  document.querySelectorAll('.bio-toggle').forEach((btn) => {
    const bio = document.getElementById(btn.getAttribute('aria-controls'));
    const label = btn.querySelector('span');
    btn.addEventListener('click', () => {
      const collapsed = bio.classList.toggle('collapsed');
      btn.setAttribute('aria-expanded', String(!collapsed));
      label.textContent = collapsed ? 'Czytaj więcej' : 'Zwiń';
    });
  });

  // Podcast category filter
  const grid = document.querySelector('[data-ep-grid]');
  if (grid) {
    const chips = document.querySelectorAll('.chips .chip');
    const empty = document.querySelector('.ep-empty');
    chips.forEach((chip) => chip.addEventListener('click', () => {
      const f = chip.dataset.filter;
      chips.forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
      let shown = 0;
      grid.querySelectorAll('.episode').forEach((ep) => {
        const on = f === 'all' || ep.dataset.cat === f;
        ep.hidden = !on;
        if (on) shown++;
      });
      grid.classList.toggle('is-filtered', f !== 'all');
      if (empty) empty.hidden = shown > 0;
    }));
  }

  // Footer year
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
});
