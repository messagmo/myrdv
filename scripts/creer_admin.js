require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../src/config/db');

async function creerAdmin() {
  const hash = await bcrypt.hash('admin12345', 10);
  await db.query(
    `INSERT INTO personnel (nom, identifiant, mot_de_passe_hashe, role)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (identifiant) DO NOTHING`,
    ['Administrateur Démo', 'admin', hash, 'administrateur']
  );
  console.log('Compte administrateur de démonstration prêt (identifiant : admin).');
  process.exit(0);
}

creerAdmin().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
