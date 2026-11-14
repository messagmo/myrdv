// Seul fichier qui parle au fournisseur de SMS.
//
// Deux modes, choisis par la variable SMS_MODE du fichier .env :
//   - simulation (défaut) : le SMS est affiché dans le terminal du serveur, rien n'est envoyé.
//   - sandbox            : appel à Africa's Talking Sandbox (à brancher par le Rôle 4).
//
// Contrat à respecter par toute fonction d'envoi :
//   envoyer(telephone, message) renvoie { statut, reference }
//     statut    : 'reussite', 'echec' ou 'simulation'
//     reference : identifiant du message chez le fournisseur, ou null
//   Une erreur levée est transformée en 'echec' par notifications.js : elle ne bloque jamais le rendez-vous.

// Numéro local (ex. 670000000) -> format international (+237670000000).
// À vérifier avec Africa's Talking avant la production (section 13 du cahier des charges).
function versFormatInternational(telephone) {
  const numero = String(telephone).trim();
  if (numero.startsWith('+')) return numero;
  if (numero.startsWith('237')) return `+${numero}`;
  return `+237${numero}`;
}

async function envoyerSimulation(numero, message) {
  console.log(`[SMS simulé] ${numero} : ${message}`);
  return { statut: 'simulation', reference: null };
}

async function envoyerAfricasTalking(numero, message) {
  // RÔLE 4 : remplacer cette erreur par l'appel au SDK Africa's Talking (Sandbox).
  //  - Lire AT_USERNAME et AT_API_KEY depuis process.env (fichier .env, jamais dans Git).
  //  - Renvoyer { statut: 'reussite', reference: <identifiant du message> } si l'envoi est accepté,
  //    ou { statut: 'echec', reference: null } sinon.
  throw new Error("Africa's Talking n'est pas encore branché (Rôle 4).");
}

async function envoyer(telephone, message) {
  const numero = versFormatInternational(telephone);
  if ((process.env.SMS_MODE || 'simulation') === 'sandbox') {
    return envoyerAfricasTalking(numero, message);
  }
  return envoyerSimulation(numero, message);
}

module.exports = { envoyer, versFormatInternational };
