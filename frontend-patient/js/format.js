// Dates au format YYYY-MM-DD ; fuseau de l'établissement : Africa/Douala (cahier des charges, règles de gestion)
const TZ = 'Africa/Douala';
const Fmt = {
  parse(iso) { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); },
  iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); },
  today() { return new Date().toLocaleDateString('en-CA', { timeZone: TZ }); },
  nowHHMM() { return new Date().toLocaleTimeString('fr-FR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }); },
  long(iso) { return this.parse(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); },
  short(iso) { return this.parse(iso).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }); }
};
