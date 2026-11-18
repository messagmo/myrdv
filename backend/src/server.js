require('dotenv').config();
const app = require('./app');
const { demarrerRappels } = require('./jobs/rappels');

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`MyRDV API démarrée sur le port ${PORT}`);
  demarrerRappels(); // Rôle 4 : rappel SMS 24 h avant (RAPPELS_ACTIFS=false pour le couper)
});
