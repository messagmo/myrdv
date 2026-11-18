// Ajoute le bouton « œil » (afficher/masquer) sur tous les champs mot de passe
(function () {
  const EYE = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
  const OFF = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
  document.querySelectorAll('input[type=password]').forEach(input => {
    const wrap = document.createElement('div'); wrap.className = 'pw';
    input.parentNode.insertBefore(wrap, input); wrap.append(input);
    const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'pw-toggle';
    const set = show => {
      input.type = show ? 'text' : 'password';
      btn.innerHTML = show ? OFF : EYE;
      btn.setAttribute('aria-label', show ? 'Masquer le mot de passe' : 'Afficher le mot de passe');
      btn.setAttribute('aria-pressed', String(show));
    };
    btn.addEventListener('click', () => set(input.type === 'password'));
    set(false); wrap.append(btn);
  });
})();
