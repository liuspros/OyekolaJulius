(function () {
  const grid = document.getElementById('resGrid');
  const toast = document.getElementById('toast');
  let toastTimer;

  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
  }

  if (!grid) return;

  // ----- Filtering -----
  const cards = [...grid.querySelectorAll('.res-card')];
  const search = document.getElementById('libSearch');
  const countEl = document.getElementById('libCount');
  const emptyEl = document.getElementById('libEmpty');
  const typeBtns = [...document.querySelectorAll('[data-type-filter]')];
  const tagBtns = [...document.querySelectorAll('[data-tag-filter]')];
  const state = { q: '', type: 'all', tag: '' };

  function apply() {
    const terms = state.q.toLowerCase().split(/\s+/).filter(Boolean);
    let shown = 0;
    cards.forEach(card => {
      const okQ = terms.every(t => card.dataset.search.includes(t));
      const okType = state.type === 'all' || card.dataset.type === state.type;
      const okTag = !state.tag || card.dataset.tags.split('|').includes(state.tag);
      const show = okQ && okType && okTag;
      card.hidden = !show;
      if (show) shown++;
    });
    if (countEl) countEl.textContent = `Showing ${shown} of ${cards.length} resources`;
    if (emptyEl) emptyEl.classList.toggle('show', shown === 0);
    typeBtns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.typeFilter === state.type)));
    tagBtns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.tagFilter === state.tag)));
  }

  if (search) search.addEventListener('input', () => { state.q = search.value; apply(); });
  typeBtns.forEach(b => b.addEventListener('click', () => { state.type = b.dataset.typeFilter; apply(); }));
  function toggleTag(tag) { state.tag = state.tag === tag ? '' : tag; apply(); }
  tagBtns.forEach(b => b.addEventListener('click', () => toggleTag(b.dataset.tagFilter)));
  grid.querySelectorAll('[data-tag]').forEach(b => b.addEventListener('click', () => {
    state.tag = b.dataset.tag; apply();
    const bar = document.getElementById('libToolbar');
    if (bar) bar.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }));
  const resetBtn = document.getElementById('libReset');
  if (resetBtn) resetBtn.addEventListener('click', () => {
    state.q = ''; state.type = 'all'; state.tag = '';
    if (search) search.value = '';
    apply();
  });
  apply();

  // ----- Copy citations -----
  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; }
    catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
      ta.remove();
      return ok;
    }
  }

  grid.querySelectorAll('[data-copy]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const card = btn.closest('.res-card');
      const now = new Date();
      const long = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      const iso = now.toISOString().slice(0, 10);
      const isLink = card.dataset.type === 'link';
      let text;
      if (btn.dataset.copy === 'apa') {
        text = card.dataset.apa;
        if (isLink) text = text.replace(card.dataset.url, `Retrieved ${long}, from ${card.dataset.url}`);
      } else {
        text = card.dataset.bibtex;
        if (isLink) text = text.replace(/\n\}$/, `,\n  urldate = {${iso}}\n}`);
      }
      const ok = await copyText(text);
      showToast(ok ? `${btn.dataset.copy === 'apa' ? 'APA citation' : 'BibTeX'} copied` : 'Could not copy. Select the text instead.');
    });
  });

  // ----- Downloads: one at a time, with a gentle per-visitor limit -----
  // This is a courtesy limit, not security. The real limit is the Vercel Firewall rate-limit rule (see LIBRARY.md).
  const MIN_GAP = 3000;               // ms between downloads
  const WINDOW = 10 * 60 * 1000;      // 10 minutes
  const MAX_IN_WINDOW = 8;
  const KEY = 'lib-downloads';

  function readLog() {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; }
  }
  function writeLog(log) {
    try { localStorage.setItem(KEY, JSON.stringify(log)); } catch (e) { /* private mode: ignore */ }
  }

  grid.querySelectorAll('[data-download]').forEach(link => {
    link.addEventListener('click', (e) => {
      const now = Date.now();
      const log = readLog().filter(t => now - t < WINDOW);
      if (log.length && now - log[log.length - 1] < MIN_GAP) {
        e.preventDefault();
        showToast('One download at a time, please. Try again in a few seconds.');
        return;
      }
      if (log.length >= MAX_IN_WINDOW) {
        e.preventDefault();
        showToast(`That's ${MAX_IN_WINDOW} downloads in 10 minutes. Take a breather and come back soon.`);
        return;
      }
      log.push(now);
      writeLog(log);
      showToast('Download started');
    });
  });
})();
