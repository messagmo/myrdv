// Parcours complet : patient -> demande de RDV -> décision du personnel -> SMS.
// Usage : node backend/test-bout-en-bout.js [telephone] [confirme|refuse]
// Le serveur doit tourner (npm run dev dans backend/).
const BASE = process.env.API_URL || 'http://localhost:3000/api';
const TEL = process.argv[2] || '655171889';
const DECISION = process.argv[3] || 'confirme';

async function appel(methode, chemin, corps, token) {
  const reponse = await fetch(BASE + chemin, {
    method: methode,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: corps ? JSON.stringify(corps) : undefined,
  });
  let donnees = null;
  try { donnees = await reponse.json(); } catch (e) { /* réponse vide */ }
  return { code: reponse.status, donnees };
}

(async () => {
  // 1. Patient fictif : inscription, ou connexion s'il existe déjà
  const MDP = 'motdepasse1';
  let r = await appel('POST', '/auth/register', {
    nom: 'Test', prenom: 'Sms', telephone: TEL, mot_de_passe: MDP,
  });
  if (r.code === 409) {
    r = await appel('POST', '/auth/login', { identifiant: TEL, mot_de_passe: MDP });
  }
  if (!r.donnees || !r.donnees.token) {
    console.log('Échec patient :', r.code, r.donnees);
    return;
  }
  const tokenPatient = r.donnees.token;
  console.log('1. Patient prêt (téléphone', TEL + ')');

  // 2. Créneaux libres
  r = await appel('GET', '/slots', null, tokenPatient);
  if (r.code !== 200 || !Array.isArray(r.donnees) || r.donnees.length === 0) {
    console.log('Aucun créneau libre :', r.code, r.donnees);
    return;
  }
  console.log('2.', r.donnees.length, 'créneau(x) libre(s)');

  // 3. Première demande acceptée parmi les créneaux
  let rdv = null;
  for (const creneau of r.donnees) {
    const d = await appel('POST', '/appointments', {
      creneau_id: creneau.id, motif_demande: 'controle',
    }, tokenPatient);
    if (d.code === 201) { rdv = d.donnees; break; }
  }
  if (!rdv) {
    console.log('Aucune demande acceptée (tous les créneaux déjà demandés ?).');
    return;
  }
  console.log('3. Demande créée : rendez-vous n°', rdv.id, '(statut', rdv.statut + ')');

  // 4. Connexion du personnel
  r = await appel('POST', '/auth/login', {
    identifiant: 'admin', mot_de_passe: 'admin12345', profil: 'personnel',
  });
  if (!r.donnees || !r.donnees.token) {
    console.log('Échec admin :', r.code, r.donnees);
    return;
  }
  console.log('4. Admin connecté');

  // 5. Décision : c'est elle qui déclenche le SMS
  const corps = DECISION === 'refuse'
    ? { statut: 'refuse', motif_decision: 'medecin_indisponible' }
    : { statut: 'confirme' };
  r = await appel('PATCH', `/appointments/${rdv.id}/status`, corps, r.donnees.token);
  console.log('5. Décision :', r.code, JSON.stringify(r.donnees));
  console.log('Vérifie le simulateur et la table notification (rendez-vous', rdv.id + ').');
})();
