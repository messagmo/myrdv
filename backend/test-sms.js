// Usage : node backend/test-sms.js [type] [telephone] [motif]
//   type    : confirmation | refus | annulation | rappel
//   motif   : medecin_indisponible | demande_incomplete | autre
// Exemples :
//   node backend/test-sms.js confirmation 655171889
//   SMS_MODE=sandbox node backend/test-sms.js refus 655171889 medecin_indisponible
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config();
const { envoyer } = require('./src/sms/fournisseur');
const { construireMessage } = require('./src/sms/messages');

const type = process.argv[2] || 'confirmation';
const telephone = process.argv[3] || '655171889';
const motif = process.argv[4] || 'medecin_indisponible';

const message = construireMessage(type, {
  date: '2026-11-20',
  heure_debut: '09:30',
  motif_decision: motif,
});
console.log('Message :', message);
envoyer(telephone, message).then((r) => console.log('Résultat :', r));
