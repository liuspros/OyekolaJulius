// ===== Theme toggle =====
const root = document.documentElement;
const themeToggle = document.getElementById('themeToggle');
const storedTheme = localStorage.getItem('theme');
const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;

function setTheme(theme) {
  root.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
}
setTheme(storedTheme || (prefersLight ? 'light' : 'dark'));

themeToggle.addEventListener('click', () => {
  const current = root.getAttribute('data-theme');
  setTheme(current === 'dark' ? 'light' : 'dark');
});

// ===== Full-screen menu overlay =====
const menuBtn = document.getElementById('menuBtn');
const menuOverlay = document.getElementById('menuOverlay');

function closeMenu() {
  menuOverlay.classList.remove('open');
  menuBtn.setAttribute('aria-expanded', 'false');
  menuBtn.textContent = 'Menu';
}

menuBtn.addEventListener('click', () => {
  const isOpen = menuOverlay.classList.toggle('open');
  menuBtn.setAttribute('aria-expanded', isOpen);
  menuBtn.textContent = isOpen ? 'Close' : 'Menu';
});

menuOverlay.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', closeMenu);
});

// ===== Footer year =====
document.getElementById('year').textContent = new Date().getFullYear();

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

// ===== Contact form =====
const contactForm = document.getElementById('contactForm');
if (contactForm) {
  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = contactForm.name.value;
    const message = contactForm.message.value;
    const text = `Hi Julius, my name is ${name}. ${message}`;
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`, '_blank');
  });
}
