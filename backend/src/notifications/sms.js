// Envoi d'un SMS : mode simulation ou Africa's Talking Sandbox.
// Ne lève jamais d'exception : renvoie toujours { statut, erreur, reference }.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '..', '.env') });

const MODE = (process.env.SMS_MODE || 'simulation').toLowerCase();
let clientSms = null;

function getClient() {
  if (!clientSms) {
    const AfricasTalking = require('africastalking');
    const at = AfricasTalking({
      apiKey: process.env.AT_API_KEY,
      username: process.env.AT_USERNAME || 'sandbox',
    });
    clientSms = at.SMS;
  }
  return clientSms;
}

async function envoyerSms(telephone, message) {
  if (!/^\+\d{8,15}$/.test(String(telephone))) {
    return { statut: 'echec', erreur: 'Numéro invalide (format attendu : +237...)', reference: null };
  }
  if (MODE === 'simulation') {
    return { statut: 'simulation', erreur: null, reference: null };
  }
  if (!process.env.AT_API_KEY) {
    return { statut: 'echec', erreur: 'AT_API_KEY manquante dans .env', reference: null };
  }
  try {
    const reponse = await getClient().send({ to: [telephone], message });
    const dest = reponse.SMSMessageData.Recipients[0];
    if (dest && dest.status === 'Success') {
      return { statut: 'reussite', erreur: null, reference: dest.messageId };
    }
    return {
      statut: 'echec',
      erreur: dest ? dest.status : reponse.SMSMessageData.Message,
      reference: null,
    };
  } catch (e) {
    return { statut: 'echec', erreur: e.message, reference: null };
  }
}

module.exports = { envoyerSms, MODE };
