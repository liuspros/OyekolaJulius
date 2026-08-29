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

// ===== Footer year =====
document.getElementById('year').textContent = new Date().getFullYear();

// ===== WhatsApp link =====
// Replace the number below with the real WhatsApp number (international format, no + or spaces)
const WHATSAPP_NUMBER = '2340000000000';
const waLink = document.getElementById('whatsappLink');
if (waLink) {
  waLink.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Hi Julius, I'd like to talk about a project.")}`;
  waLink.target = '_blank';
  waLink.rel = 'noopener';
}

// ===== Contact form =====
const contactForm = document.getElementById('contactForm');
if (contactForm) {
  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    // Placeholder: wire this up to a form backend (Formspree, EmailJS, or a Firebase function)
    const name = contactForm.name.value;
    const message = contactForm.message.value;
    const text = `Hi Julius, my name is ${name}. ${message}`;
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`, '_blank');
  });
}

// ===== Scroll reveal =====
const revealTargets = document.querySelectorAll('.bio-copy, .bio-facts, .work-col, .ptype, .tl-item, .social-pill, .contact-form, .contact-copy');
revealTargets.forEach(el => el.classList.add('reveal'));

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('reveal-visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });

revealTargets.forEach(el => observer.observe(el));
