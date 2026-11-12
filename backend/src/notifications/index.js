// Point d'entrée du module : notifier() est la seule fonction appelée par le backend.
const { genererMessage } = require('./templates');
const { envoyerSms } = require('./sms');
const { enregistrerJournal } = require('./journal');

// type : 'confirmation' | 'refus' | 'annulation' | 'rappel'
async function notifier({ rendezVousId, type, telephone, date, heure, motif }) {
  let message = '';
  let resultat;
  try {
    message = genererMessage(type, { date, heure, motif });
    resultat = await envoyerSms(telephone, message);
  } catch (e) {
    resultat = { statut: 'echec', erreur: e.message, reference: null };
  }
  try {
    await enregistrerJournal({
      rendez_vous_id: rendezVousId,
      type,
      statut_envoi: resultat.statut,
      telephone_destinataire: telephone,
      message,
      message_erreur: resultat.erreur,
      reference_fournisseur: resultat.reference,
    });
  } catch (e) {
    console.error('Journal SMS impossible :', e.message);
  }
  return resultat; // un échec SMS ne doit jamais bloquer la confirmation d'un RDV
}

module.exports = { notifier };
