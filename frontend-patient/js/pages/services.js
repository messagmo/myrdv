Auth.requireAuth();
const who = Auth.displayName();
if (who) document.getElementById('hello').textContent = 'Bonjour ' + who + ', choisissez un service';
const list = document.getElementById('list');
(async () => {
  try {
    const services = await Api.getServices();
    list.textContent = '';
    if (!services.length) return list.innerHTML = '<p class="center">Aucun service disponible pour le moment.</p>';
    services.forEach(s => {
      const a = document.createElement('a'); a.className = 'card'; a.href = 'medecins.html?service=' + encodeURIComponent(s.id);
      const t = document.createElement('strong'); t.textContent = s.nom;
      const d = document.createElement('span'); d.textContent = s.description || '';
      a.append(t, d); list.append(a);
    });
  } catch (x) { list.innerHTML = '<div class="error" role="alert"></div>'; list.firstChild.textContent = x.message + ' Rechargez la page pour réessayer.'; }
})();
