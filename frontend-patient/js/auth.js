// Session patient + validation du téléphone (format camerounais)
const Auth = {
  save(s) { localStorage.setItem('myrdv_token', s.token); localStorage.setItem('myrdv_user', JSON.stringify(s.user)); },
  getToken() { return localStorage.getItem('myrdv_token'); },
  getUser() { try { return JSON.parse(localStorage.getItem('myrdv_user')); } catch { return null; } },
  displayName() { const u = this.getUser(); return u ? ((u.prenom || '') + ' ' + (u.nom || '')).trim() : ''; },
  logout() { localStorage.removeItem('myrdv_token'); localStorage.removeItem('myrdv_user'); location.href = 'login.html'; },
  requireAuth() { if (!this.getToken()) location.href = 'login.html'; },
  // Retourne "+2376XXXXXXXX" ou null si le numéro est invalide
  normalizePhone(v) {
    const d = v.replace(/[\s.-]/g, '').replace(/^\+?237/, '');
    return /^6\d{8}$/.test(d) ? '+237' + d : null;
  }
};
