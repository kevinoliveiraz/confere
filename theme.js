'use strict';

// Executa no head para aplicar a preferência antes da primeira pintura.
(() => {
  const storageKey = 'confere.theme';
  const root = document.documentElement;
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
  let preference = null;
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved === 'dark' || saved === 'light') preference = saved;
  } catch (error) { /* Sem armazenamento, o tema funciona durante a sessão. */ }

  function applyTheme() {
    const dark = preference ? preference === 'dark' : systemTheme.matches;
    root.dataset.theme = dark ? 'dark' : 'light';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#101813' : '#194f43');
    const button = document.querySelector('#theme-toggle');
    if (button) {
      const label = dark ? 'Ativar modo claro' : 'Ativar modo escuro';
      button.setAttribute('aria-pressed', String(dark));
      button.setAttribute('aria-label', label);
      button.title = label;
    }
  }

  function bindToggle() {
    document.querySelector('#theme-toggle')?.addEventListener('click', () => {
      preference = root.dataset.theme === 'dark' ? 'light' : 'dark';
      applyTheme();
      try { localStorage.setItem(storageKey, preference); }
      catch (error) { /* Não altera o salvamento das contagens. */ }
    });
    applyTheme();
  }

  applyTheme();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindToggle, {once: true});
  else bindToggle();
  systemTheme.addEventListener('change', () => { if (!preference) applyTheme(); });
})();
