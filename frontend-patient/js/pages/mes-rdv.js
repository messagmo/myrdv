Auth.requireAuth();
const list = document.getElementById('list'), msg = document.getElementById('msg');
const LABELS = { en_attente: 'En attente', confirme: 'Confirmé', refuse: 'Refusé', annule: 'Annulé' };
if (new URLSearchParams(location.search).has('nouveau')) {
  msg.className = 'success'; msg.textContent = 'Demande envoyée. Vous recevrez un SMS dès que l\'hôpital aura confirmé.';
}

async function load() {
  try {
    const rdvs = await Api.getMesRdv();
    list.textContent = '';
    if (!rdvs.length) {
      list.innerHTML = '<p class="empty">Vous n\'avez pas encore de rendez-vous.</p><a class="btn small" href="rdv-nouveau.html" style="display:flex;align-items:center;justify-content:center;text-decoration:none;color:#fff">Prendre rendez-vous</a>';
      return;
    }
    rdvs.forEach(r => {
      const card = document.createElement('div'); card.className = 'card';
      const tag = document.createElement('span'); tag.className = 'tag ' + r.statut; tag.textContent = LABELS[r.statut] || r.statut;
      const when = document.createElement('strong');
      when.textContent = Fmt.long(r.date) + (r.debut ? (r.fin ? ' de ' + r.debut + ' à ' + r.fin : ' à ' + r.debut) : '');
      const who = document.createElement('span'); who.textContent = [r.medecin, r.service].filter(Boolean).join(' · ');
      card.append(tag, when, who);
      if (r.statut === 'refuse' && r.motifRefus) { const z = document.createElement('span'); z.textContent = 'Motif du refus : ' + r.motifRefus; card.append(z); }
      if (r.motif) { const m = document.createElement('span'); m.textContent = 'Motif : ' + r.motif; card.append(m); }
      if (r.statut === 'en_attente' || r.statut === 'confirme') {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'btn small alt';
        b.textContent = r.statut === 'en_attente' ? 'Annuler la demande' : 'Annuler le rendez-vous';
        b.addEventListener('click', async () => {
          if (!confirm('Voulez-vous vraiment annuler ce rendez-vous ?')) return;
          b.disabled = true;
          try { await Api.cancelRdv(r.id); msg.className = 'success'; msg.textContent = 'Rendez-vous annulé.'; load(); }
          catch (x) { msg.className = 'error'; msg.textContent = x.message; b.disabled = false; }
        });
        card.append(b);
      }
      list.append(card);
    });
  } catch (x) { list.innerHTML = '<div class="error" role="alert"></div>'; list.firstChild.textContent = x.message; }
}
load();
