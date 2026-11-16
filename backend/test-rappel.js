// Lance UN passage du rappel, puis s'arrête. Usage : node backend/test-rappel.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { envoyerRappels } = require('./src/jobs/rappels');

envoyerRappels().then((n) => {
  console.log(`Passage terminé : ${n} rappel(s) traité(s).`);
  process.exit(0);
});
