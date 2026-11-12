// Journal des envois. Version provisoire : fichier local.
// À remplacer au J5 par un INSERT dans la table notification (Rôle 2).
const fs = require('fs');
const path = require('path');

const DOSSIER = path.join(__dirname, '..', '..', 'logs');

async function enregistrerJournal(entree) {
  fs.mkdirSync(DOSSIER, { recursive: true });
  const ligne = JSON.stringify({ ...entree, date_tentative: new Date().toISOString() });
  fs.appendFileSync(path.join(DOSSIER, 'notifications.jsonl'), ligne + '\n');
  return entree;
}

module.exports = { enregistrerJournal };
