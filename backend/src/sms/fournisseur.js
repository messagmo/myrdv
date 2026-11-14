// Seul fichier qui parle au fournisseur de SMS.
//
// Deux modes, choisis par la variable SMS_MODE du fichier .env :
//   - simulation (défaut) : le SMS est affiché dans le terminal du serveur, rien n'est envoyé.
//   - sandbox            : appel à Africa's Talking Sandbox (Rôle 4).
//
// Contrat à respecter par toute fonction d'envoi :
//   envoyer(telephone, message) renvoie { statut, reference }
//     statut    : 'reussite', 'echec' ou 'simulation'
//     reference : identifiant du message chez le fournisseur, ou null
//   Une erreur levée est transformée en 'echec' par notifications.js : elle ne bloque jamais le rendez-vous.

// Numéro local (ex. 670000000) -> format international (+237670000000).
function versFormatInternational(telephone) {
  const numero = String(telephone).trim().replace(/[\s.-]/g, '');
  if (numero.startsWith('+')) return numero;
  if (numero.startsWith('237')) return `+${numero}`;
  return `+237${numero}`;
}

// Format international complet : + puis 11 à 15 chiffres (ex. +237655171889).
function numeroValide(numero) {
  return /^\+\d{11,15}$/.test(numero);
}

async function envoyerSimulation(numero, message) {
  console.log(`[SMS simulé] ${numero} : ${message}`);
  return { statut: 'simulation', reference: null };
}

let clientSms = null;

function obtenirClient() {
  if (!clientSms) {
    const AfricasTalking = require('africastalking');
    clientSms = AfricasTalking({
      apiKey: process.env.AT_API_KEY,
      username: process.env.AT_USERNAME || 'sandbox',
    }).SMS;
  }
  return clientSms;
}

async function envoyerAfricasTalking(numero, message) {
  if (!process.env.AT_API_KEY) {
    console.error("[SMS] AT_API_KEY manquante dans .env");
    return { statut: 'echec', reference: null };
  }
  try {
    const reponse = await obtenirClient().send({ to: [numero], message });
    const destinataire = reponse.SMSMessageData.Recipients[0];
    if (destinataire && destinataire.status === 'Success') {
      return { statut: 'reussite', reference: destinataire.messageId };
    }
    console.error(`[SMS] Refusé par Africa's Talking : ${destinataire ? destinataire.status : reponse.SMSMessageData.Message}`);
    return { statut: 'echec', reference: null };
  } catch (err) {
    console.error(`[SMS] Erreur Africa's Talking : ${err.message}`);
    return { statut: 'echec', reference: null };
  }
}

async function envoyer(telephone, message) {
  const numero = versFormatInternational(telephone);
  if (!numeroValide(numero)) {
    console.error(`[SMS] Numéro invalide : ${numero}`);
    return { statut: 'echec', reference: null };
  }
  if ((process.env.SMS_MODE || 'simulation') === 'sandbox') {
    return envoyerAfricasTalking(numero, message);
  }
  return envoyerSimulation(numero, message);
}

module.exports = { envoyer, versFormatInternational };
