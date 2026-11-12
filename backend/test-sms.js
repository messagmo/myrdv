// Usage : node backend/test-sms.js [type] [telephone] [motif]
// Exemples :
//   node backend/test-sms.js confirmation +237655171889
//   SMS_MODE=sandbox node backend/test-sms.js refus +237655171889 "médecin indisponible"
const { notifier } = require('./src/notifications');

const type = process.argv[2] || 'confirmation';
const telephone = process.argv[3] || '+237600000000';
const motif = process.argv[4] || 'médecin indisponible';

notifier({
  rendezVousId: 0,
  type,
  telephone,
  date: '2026-11-20',
  heure: '09:30:00',
  motif,
}).then((r) => console.log('Résultat :', r));
