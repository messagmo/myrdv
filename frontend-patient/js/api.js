// Tous les appels au back-end passent par ce fichier (voir CONTRAT_API.md).
// USE_MOCK = true : données simulées (localStorage). Mettre false quand l'API Express est prête.
const CONFIG = { USE_MOCK: true, API_URL: 'http://localhost:3000/api' };

// ---------- Adaptateurs : tolèrent snake_case / camelCase et les objets imbriqués ----------
const pick = (o, ...paths) => {
  for (const p of paths) {
    const v = p.split('.').reduce((a, k) => (a == null ? undefined : a[k]), o);
    if (v !== undefined && v !== null && v !== '') return v;
  }
};
const toList = r => Array.isArray(r) ? r : (r && (r.data || r.items || r.results)) || [];
const hhmm = v => (v ? String(v).slice(0, 5) : '');
const isoDate = v => (v ? String(v).slice(0, 10) : '');
function normStatut(s) {
  const x = String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\s-]+/g, '_');
  return { pending: 'en_attente', confirmed: 'confirme', accepted: 'confirme', refused: 'refuse', rejected: 'refuse', cancelled: 'annule', canceled: 'annule' }[x] || x;
}
const normService = s => ({ id: s.id, nom: pick(s, 'nom', 'name'), description: pick(s, 'description', 'description_courte') || '' });
const normDoctor = d => ({
  id: d.id, nom: pick(d, 'nom', 'name'), serviceId: pick(d, 'service_id', 'serviceId', 'service.id'),
  service: (typeof d.service === 'string' ? d.service : pick(d, 'service_nom', 'service_name', 'service.nom', 'service.name')) || ''
});
const normSlot = s => ({
  id: s.id, date: isoDate(pick(s, 'date')),
  debut: hhmm(pick(s, 'start_time', 'heure_debut', 'heure_début', 'startTime')), fin: hhmm(pick(s, 'end_time', 'heure_fin', 'endTime'))
});
const normRdv = a => ({
  id: a.id, statut: normStatut(pick(a, 'statut', 'status')),
  date: isoDate(pick(a, 'date', 'slot.date', 'creneau.date')),
  debut: hhmm(pick(a, 'start_time', 'heure_debut', 'slot.start_time', 'creneau.heure_debut')),
  fin: hhmm(pick(a, 'end_time', 'heure_fin', 'slot.end_time', 'creneau.heure_fin')),
  medecin: pick(a, 'doctor_name', 'medecin_nom', 'doctor.nom', 'doctor.name', 'medecin.nom') || '',
  service: pick(a, 'service_name', 'service_nom', 'doctor.service.nom', 'doctor.service_name', 'service.nom') || '',
  motif: pick(a, 'motif', 'reason') || '',
  motifRefus: pick(a, 'motif_refus', 'refusal_reason', 'decision_reason', 'reject_reason') || ''
});
function normSession(r) {
  const u = pick(r, 'user', 'patient', 'data.user') || {};
  return {
    token: pick(r, 'token', 'accessToken', 'access_token', 'data.token'),
    user: { id: u.id, nom: u.nom || '', prenom: u.prenom || '', telephone: u.telephone || '', role: String(u.role || 'patient').toLowerCase() }
  };
}

// ---------- Appels HTTP ----------
async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = Auth.getToken();
  if (token) headers.Authorization = 'Bearer ' + token;
  let res;
  try { res = await fetch(CONFIG.API_URL + path, { ...options, headers }); }
  catch { throw new Error('Impossible de joindre le serveur. Vérifiez votre connexion.'); }
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && token) Auth.logout();
  if (!res.ok) throw new Error(String(pick(data, 'message', 'error') || 'Une erreur est survenue.'));
  return data;
}
const post = (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) });

// ---------- Simulation (données fictives, même format que l'API) ----------
const wait = (ms = 300) => new Promise(r => setTimeout(r, ms));
const MOCK = {
  services: [
    { id: 1, nom: 'Médecine générale', description: 'Consultations et suivi courant' },
    { id: 2, nom: 'Pédiatrie', description: 'Santé des enfants et nourrissons' },
    { id: 3, nom: 'Gynécologie', description: 'Suivi et consultations' },
    { id: 4, nom: 'Cardiologie', description: 'Cœur et circulation' },
    { id: 5, nom: 'Dentisterie', description: 'Soins dentaires' }
  ],
  doctors: [
    { id: 1, nom: 'Dr Nguema Claire', service_id: 1 }, { id: 2, nom: 'Dr Tchoumi Paul', service_id: 1 },
    { id: 3, nom: 'Dr Essomba Aline', service_id: 2 }, { id: 4, nom: 'Dr Fotso Daniel', service_id: 3 },
    { id: 5, nom: 'Dr Mballa Serge', service_id: 4 }, { id: 6, nom: 'Dr Atangana Rose', service_id: 5 }
  ],
  get(k) { return JSON.parse(localStorage.getItem('myrdv_' + k) || '[]'); },
  set(k, v) { localStorage.setItem('myrdv_' + k, JSON.stringify(v)); },
  // Créneaux de 30 min, du lundi au vendredi, 14 jours, hors créneaux pris et heures passées
  slots(doctorId) {
    const out = [], d = Fmt.parse(Fmt.today()), now = Fmt.nowHHMM(), today = Fmt.today();
    const taken = new Set(this.get('rdvs').filter(r => r.statut !== 'annule').map(r => r.slot_id));
    const T = [['08:00', '08:30'], ['09:30', '10:00'], ['11:00', '11:30'], ['14:30', '15:00'], ['16:00', '16:30']];
    for (let i = 0; i < 14; i++, d.setDate(d.getDate() + 1)) {
      if (d.getDay() === 0 || d.getDay() === 6) continue;
      const date = Fmt.iso(d);
      T.forEach(([s, e]) => {
        const id = doctorId + '_' + date + '_' + s;
        if (!taken.has(id) && !(date === today && s <= now)) out.push({ id, doctor_id: doctorId, date, start_time: s, end_time: e });
      });
    }
    return out;
  },
  rdvView(r) {
    const m = this.doctors.find(x => x.id === r.doctor_id);
    return { ...r, doctor_name: m.nom, service_name: this.services.find(s => s.id === m.service_id).nom };
  }
};

// ---------- API utilisée par les pages ----------
const Api = {
  // Corps : { nom, prenom, telephone, email?, password } -> session { token, user }
  async register(p) {
    if (!CONFIG.USE_MOCK) {
      const s = normSession(await post('/auth/register', p));
      return s.token ? s : this.login({ telephone: p.telephone, password: p.password });
    }
    await wait();
    const users = MOCK.get('users');
    if (users.some(u => u.telephone === p.telephone)) throw new Error('Ce numéro est déjà utilisé.');
    const u = { id: Date.now(), role: 'patient', ...p }; // mot de passe en clair : simulation uniquement
    MOCK.set('users', [...users, u]);
    return normSession({ token: 'mock-' + u.id, user: u });
  },
  async login({ telephone, password }) {
    let s;
    if (CONFIG.USE_MOCK) {
      await wait();
      const u = MOCK.get('users').find(x => x.telephone === telephone && x.password === password);
      if (!u) throw new Error('Numéro ou mot de passe incorrect.');
      s = normSession({ token: 'mock-' + u.id, user: u });
    } else s = normSession(await post('/auth/login', { telephone, password }));
    if (!s.token) throw new Error('Réponse inattendue du serveur.');
    if (s.user.role !== 'patient') throw new Error('Ce compte est réservé au personnel de l\'hôpital.');
    return s;
  },
  async getServices() {
    const r = CONFIG.USE_MOCK ? (await wait(), MOCK.services) : await request('/services');
    return toList(r).map(normService);
  },
  async getDoctors(serviceId) {
    const r = CONFIG.USE_MOCK ? (await wait(), MOCK.doctors.filter(m => !serviceId || m.service_id === Number(serviceId)))
      : await request('/doctors' + (serviceId ? '?service_id=' + encodeURIComponent(serviceId) : ''));
    return toList(r).map(normDoctor);
  },
  // Créneaux libres d'un médecin : [{ id, date, start_time, end_time }]
  async getSlots(doctorId) {
    const r = CONFIG.USE_MOCK ? (await wait(150), MOCK.slots(Number(doctorId))) : await request('/slots?doctor_id=' + encodeURIComponent(doctorId));
    return toList(r).map(normSlot).sort((a, b) => (a.date + a.debut).localeCompare(b.date + b.debut));
  },
  // Corps : { doctor_id, slot_id, motif? } -> rendez-vous créé, statut « en attente »
  async createRdv({ doctorId, slotId, motif }) {
    if (!CONFIG.USE_MOCK) return post('/appointments', { doctor_id: doctorId, slot_id: slotId, motif: motif || undefined });
    await wait();
    const slot = MOCK.slots(Number(doctorId)).find(s => s.id === slotId);
    if (!slot) throw new Error('Ce créneau vient d\'être pris. Choisissez un autre horaire.');
    const r = { id: Date.now(), user_id: Auth.getUser().id, doctor_id: slot.doctor_id, slot_id: slot.id, date: slot.date,
      start_time: slot.start_time, end_time: slot.end_time, motif: motif || '', statut: 'en_attente' };
    MOCK.set('rdvs', [...MOCK.get('rdvs'), r]); return r;
  },
  async getMesRdv() {
    const r = CONFIG.USE_MOCK ? (await wait(), MOCK.get('rdvs').filter(x => x.user_id === Auth.getUser().id).map(x => MOCK.rdvView(x)))
      : await request('/appointments/me');
    return toList(r).map(normRdv).sort((a, b) => (b.date + b.debut).localeCompare(a.date + a.debut));
  },
  async cancelRdv(id) {
    if (!CONFIG.USE_MOCK) return post('/appointments/' + id + '/cancel', {});
    await wait();
    MOCK.set('rdvs', MOCK.get('rdvs').map(r => r.id === id ? { ...r, statut: 'annule' } : r));
    return { id, statut: 'annule' };
  }
};
