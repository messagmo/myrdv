Auth.requireAuth();
const f = document.getElementById('form'), err = document.getElementById('error'), btn = document.getElementById('submit');
const daysBox = document.getElementById('days'), daysMsg = document.getElementById('days-msg');
const slotsBox = document.getElementById('slots'), slotsMsg = document.getElementById('slots-msg');
let doctors = [], slots = [], day = '';

const opt = (v, t) => { const o = document.createElement('option'); o.value = v; o.textContent = t; return o; };

function fillDoctors(serviceId, keep) {
  f.medecin.textContent = '';
  f.medecin.append(opt('', 'Choisir un médecin'));
  doctors.filter(m => String(m.serviceId) === String(serviceId)).forEach(m => f.medecin.append(opt(m.id, m.nom)));
  if (keep) f.medecin.value = keep;
}

function renderHours() {
  slotsBox.querySelectorAll('label').forEach(l => l.remove());
  const list = slots.filter(s => s.date === day);
  slotsMsg.hidden = list.length > 0;
  slotsMsg.textContent = 'Choisissez un jour.';
  list.forEach(s => {
    const l = document.createElement('label'); l.className = 'slot';
    const i = document.createElement('input'); i.type = 'radio'; i.name = 'slot'; i.value = s.id;
    const t = document.createElement('span'); t.textContent = s.debut + (s.fin ? ' – ' + s.fin : '');
    l.append(i, t); slotsBox.append(l);
  });
}

function renderDays() {
  daysBox.textContent = '';
  const dates = [...new Set(slots.map(s => s.date))];
  daysMsg.hidden = dates.length > 0;
  if (!dates.length) daysMsg.textContent = f.medecin.value ? 'Aucun créneau disponible pour ce médecin pour le moment.' : 'Choisissez un médecin.';
  dates.forEach(d => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'pill'; b.textContent = Fmt.short(d);
    b.setAttribute('aria-pressed', String(d === day));
    b.addEventListener('click', () => { day = d; renderDays(); });
    daysBox.append(b);
  });
  renderHours();
}

async function loadSlots() {
  slots = []; day = ''; err.textContent = '';
  if (!f.medecin.value) return renderDays();
  daysMsg.hidden = false; daysMsg.textContent = 'Chargement…';
  try { slots = await Api.getSlots(f.medecin.value); } catch (x) { err.textContent = x.message; }
  renderDays();
}

(async () => {
  try {
    const [services, all] = await Promise.all([Api.getServices(), Api.getDoctors()]);
    doctors = all;
    services.forEach(s => f.service.append(opt(s.id, s.nom)));
    const pre = all.find(m => String(m.id) === new URLSearchParams(location.search).get('medecin'));
    f.service.value = pre ? pre.serviceId : (services[0] || {}).id;
    fillDoctors(f.service.value, pre && pre.id);
    if (pre) loadSlots();
  } catch (x) { err.textContent = x.message; }
})();

f.service.addEventListener('change', () => { fillDoctors(f.service.value); loadSlots(); });
f.medecin.addEventListener('change', loadSlots);

f.addEventListener('submit', async e => {
  e.preventDefault(); err.textContent = '';
  const slotId = (f.querySelector('input[name=slot]:checked') || {}).value;
  if (!f.medecin.value) return err.textContent = 'Choisissez un médecin.';
  if (!day) return err.textContent = 'Choisissez un jour.';
  if (!slotId) return err.textContent = 'Choisissez une heure.';
  btn.disabled = true; btn.textContent = 'Envoi…';
  try {
    await Api.createRdv({ doctorId: f.medecin.value, slotId, motif: f.motif.value.trim() });
    location.href = 'mes-rdv.html?nouveau=1';
  } catch (x) { err.textContent = x.message; btn.disabled = false; btn.textContent = 'Envoyer la demande'; loadSlots(); }
});
