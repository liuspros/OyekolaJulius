// ===== Full-screen menu overlay =====
const menuBtn = document.getElementById('menuBtn');
const menuOverlay = document.getElementById('menuOverlay');

function setMenu(open) {
  menuOverlay.classList.toggle('open', open);
  menuBtn.setAttribute('aria-expanded', String(open));
  menuBtn.textContent = open ? 'Close' : 'Menu';
  document.body.style.overflow = open ? 'hidden' : '';
}

if (menuBtn && menuOverlay) {
  menuBtn.addEventListener('click', () => setMenu(!menuOverlay.classList.contains('open')));
  menuOverlay.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
}

// ===== Footer year =====
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

// ===== WhatsApp + email links =====
// Replace with real contact details before launch
const WHATSAPP_NUMBER = '2340000000000';
const CONTACT_EMAIL = 'contact@oyekolajulius.com';

const footerWa = document.getElementById('footerWhatsapp');
if (footerWa) {
  footerWa.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Hi Julius, I'd like to talk about a project.")}`;
  footerWa.target = '_blank';
  footerWa.rel = 'noopener';
}

const emailPill = document.getElementById('emailPill');
if (emailPill) {
  emailPill.href = `mailto:${CONTACT_EMAIL}`;
  emailPill.textContent = CONTACT_EMAIL;
}

// ===== Scroll reveal (fade-up) =====
const revealSelectors = [
  '.hero-tag',
  '.swash-heading', '.intro-copy p',
  '.geo-left', '.geo-right', '.geo-connector .pill-outline',
  '.jr-facts li', '.jr-wordmark', '.jr-footer',
  '.lius-lead', '.price-card',
  '.offer-col h3', '.ai-card', '.offer-copy', '.skill-pills',
  '.lib-teaser-lead', '.lib-tile',
  '.voice-statement', '.voice-signoff',
  '.facts .fact', '.portrait',
  '.lib-lead', '.lib-pills', '.principle'
];
document.querySelectorAll(revealSelectors.join(',')).forEach(el => el.classList.add('reveal'));

const revealTargets = document.querySelectorAll('.reveal');
const wipeTargets = document.querySelectorAll('.wipe-heading');

if ('IntersectionObserver' in window) {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('reveal-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  revealTargets.forEach(el => revealObserver.observe(el));

  // Masked line-wipe for the tall headings
  const wipeObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('lines-visible');
        wipeObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  wipeTargets.forEach(el => wipeObserver.observe(el));
} else {
  revealTargets.forEach(el => el.classList.add('reveal-visible'));
  wipeTargets.forEach(el => el.classList.add('lines-visible'));
}

// ===== Brand marquee: swap wordmarks for real logos when the files exist =====
// Add transparent logos to the site root named logo-<brand>.svg (or .png), e.g. logo-bevic-devices.svg
(function () {
  const brands = document.querySelectorAll('.brand[data-logo]');
  if (!brands.length) return;
  const bases = [...new Set([...brands].map(b => b.dataset.logo))];
  bases.forEach(base => {
    const exts = ['svg', 'png'];
    (function tryNext(i) {
      if (i >= exts.length) return;
      const probe = new Image();
      probe.onload = () => {
        document.querySelectorAll(`.brand[data-logo="${base}"]`).forEach(el => {
          const name = el.querySelector('.brand-name').textContent.trim();
          const hidden = el.closest('[aria-hidden="true"]');
          const img = new Image();
          img.src = probe.src;
          img.alt = hidden ? '' : `${name} logo`;
          img.decoding = 'async';
          el.prepend(img);
          el.classList.add('has-logo');
        });
      };
      probe.onerror = () => tryNext(i + 1);
      probe.src = `/${base}.${exts[i]}`;
    })(0);
  });
})();
