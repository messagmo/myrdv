const notificationData = require('../data/notification');
const fournisseur = require('./fournisseur');
const { construireMessage } = require('./messages');

// Point d'entrée unique pour prévenir un patient.
// type : 'confirmation', 'refus', 'annulation' ou 'rappel'.
// Ne lève JAMAIS d'erreur : un problème de SMS ne doit pas annuler un rendez-vous déjà enregistré.
// Chaque tentative est conservée dans la table notification (réussite, échec ou simulation).
async function notifier(rendezVousId, type) {
  try {
    const infos = await notificationData.trouverInfosRendezVous(rendezVousId);
    if (!infos) return null;

    const message = construireMessage(type, infos);

    let resultat;
    try {
      resultat = await fournisseur.envoyer(infos.telephone, message);
    } catch (err) {
      console.error(`[SMS] Échec d'envoi (${type}, rendez-vous ${rendezVousId}) : ${err.message}`);
      resultat = { statut: 'echec', reference: null };
    }

    return await notificationData.creer({
      rendezVousId,
      type,
      statutEnvoi: resultat.statut,
      referenceFournisseur: resultat.reference,
    });
  } catch (err) {
    console.error(`[SMS] Notification non enregistrée (${type}, rendez-vous ${rendezVousId}) : ${err.message}`);
    return null;
  }
}

module.exports = { notifier };
