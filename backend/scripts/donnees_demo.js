// Données de démonstration FICTIVES (services, médecins, créneaux des 5 prochains jours)
require('dotenv').config();
const db = require('../src/config/db');

async function creerDonneesDemo() {
  const deja = await db.query('SELECT COUNT(*)::int AS n FROM medecin');
  if (deja.rows[0].n > 0) {
    console.log('Des médecins existent déjà : aucune donnée ajoutée.');
    process.exit(0);
  }

  await db.query(
    `INSERT INTO service (nom, description_courte) VALUES
       ('Médecine générale', 'Consultations générales'),
       ('Pédiatrie', 'Consultations pour enfants'),
       ('Cardiologie', 'Consultations du coeur et des vaisseaux')
     ON CONFLICT (nom) DO NOTHING`
  );

  await db.query(
    `INSERT INTO medecin (nom, service_id)
     SELECT v.nom, s.id
     FROM (VALUES
       ('Dr Démo Alpha', 'Médecine générale'),
       ('Dr Démo Bêta', 'Pédiatrie'),
       ('Dr Démo Gamma', 'Cardiologie')
     ) AS v(nom, service)
     JOIN service s ON s.nom = v.service`
  );

  await db.query(
    `INSERT INTO creneau (medecin_id, date, heure_debut, heure_fin)
     SELECT m.id, CURRENT_DATE + d, h::time, h::time + interval '1 hour'
     FROM medecin m,
          generate_series(1, 5) AS d,
          unnest(ARRAY['08:00', '09:00', '10:00']) AS h
     ON CONFLICT DO NOTHING`
  );

  console.log('Données de démonstration créées (services, médecins, créneaux).');
  process.exit(0);
}

creerDonneesDemo().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
