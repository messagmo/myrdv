-- Données fictives pour tester le rappel : un créneau dans 24 h et un RDV confirmé.
WITH c AS (
  INSERT INTO creneau (medecin_id, date, heure_debut, heure_fin, statut)
  SELECT m.id, t.d::date, t.d::time(0), (t.d + interval '30 minutes')::time(0), 'disponible'
  FROM (SELECT id FROM medecin ORDER BY id LIMIT 1) m,
       (SELECT now() AT TIME ZONE 'Africa/Douala' + interval '24 hours' AS d) t
  RETURNING id, medecin_id
)
INSERT INTO rendez_vous (patient_id, medecin_id, creneau_id, statut)
SELECT p.id, c.medecin_id, c.id, 'confirme'
FROM c, patient p
WHERE p.telephone = '655171889'
RETURNING id;
