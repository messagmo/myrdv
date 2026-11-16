// Rappel SMS envoyé environ 24 h avant un rendez-vous confirmé (cahier des charges, section 5.3).
// Un seul rappel par rendez-vous : on ignore ceux qui ont déjà une ligne 'rappel' dans notification.
const cron = require('node-cron');
const db = require('../config/db');
const { notifier } = require('../sms/notifications');

const FUSEAU = 'Africa/Douala';
let enCours = false; // évite deux passages en même temps

// Rendez-vous confirmés dont le créneau commence dans 23 à 25 heures, sans rappel déjà tracé.
async function trouverRendezVousARappeler() {
  const r = await db.query(
    `SELECT r.id
     FROM rendez_vous r
     JOIN creneau c ON c.id = r.creneau_id
     WHERE r.statut = 'confirme'
       AND ((c.date + c.heure_debut) AT TIME ZONE $1)
           BETWEEN now() + interval '23 hours' AND now() + interval '25 hours'
       AND NOT EXISTS (
         SELECT 1 FROM notification n
         WHERE n.rendez_vous_id = r.id AND n.type = 'rappel'
       )
     ORDER BY r.id`,
    [FUSEAU]
  );
  return r.rows.map((ligne) => ligne.id);
}

// Un passage : renvoie le nombre de rappels traités.
async function envoyerRappels() {
  if (enCours) return 0;
  enCours = true;
  try {
    const ids = await trouverRendezVousARappeler();
    for (const id of ids) {
      await notifier(id, 'rappel'); // ne lève jamais d'erreur
    }
    if (ids.length > 0) console.log(`[Rappels] ${ids.length} rappel(s) traité(s).`);
    return ids.length;
  } catch (err) {
    console.error(`[Rappels] Erreur : ${err.message}`);
    return 0;
  } finally {
    enCours = false;
  }
}

// À appeler une fois au démarrage du serveur.
function demarrerRappels() {
  if (process.env.RAPPELS_ACTIFS === 'false') {
    console.log('[Rappels] Désactivés (RAPPELS_ACTIFS=false).');
    return null;
  }
  const tache = cron.schedule('*/15 * * * *', envoyerRappels, { timezone: FUSEAU });
  console.log('[Rappels] Planifiés toutes les 15 minutes.');
  return tache;
}

module.exports = { demarrerRappels, envoyerRappels, trouverRendezVousARappeler };
