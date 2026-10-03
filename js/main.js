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

  // Footer year
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
});
