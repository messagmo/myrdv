Auth.requireAuth();
const pills = document.getElementById('pills'), list = document.getElementById('list');
let services = [], current = new URLSearchParams(location.search).get('service') || '';

function showError(x) { list.innerHTML = '<div class="error" role="alert"></div>'; list.firstChild.textContent = x.message; }

function renderPills() {
  pills.textContent = '';
  [{ id: '', nom: 'Tous' }, ...services].forEach(s => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'pill'; b.textContent = s.nom;
    b.setAttribute('aria-pressed', String(String(s.id) === String(current)));
    b.addEventListener('click', () => { current = String(s.id); renderPills(); load(); });
    pills.append(b);
  });
}

async function load() {
  list.innerHTML = '<p class="empty">Chargement…</p>';
  try {
    const medecins = await Api.getDoctors(current);
    list.textContent = '';
    if (!medecins.length) return list.innerHTML = '<p class="empty">Aucun médecin dans ce service pour le moment.</p>';
    medecins.forEach(m => {
      const card = document.createElement('div'); card.className = 'card';
      const n = document.createElement('strong'); n.textContent = m.nom;
      const s = document.createElement('span');
      s.textContent = m.service || (services.find(x => String(x.id) === String(m.serviceId)) || {}).nom || '';
      const a = document.createElement('a'); a.className = 'btn small'; a.href = 'rdv-nouveau.html?medecin=' + encodeURIComponent(m.id);
      a.style.cssText = 'display:flex;align-items:center;justify-content:center;text-decoration:none;color:#fff;margin-top:6px';
      a.textContent = 'Voir les créneaux et réserver';
      card.append(n, s, a); list.append(card);
    });
  } catch (x) { showError(x); }
}

Api.getServices().then(s => { services = s; renderPills(); load(); }).catch(showError);
