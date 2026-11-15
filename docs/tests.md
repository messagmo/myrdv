# Tests MyRDV : module SMS (Rôle 4)

À rapprocher des scénarios de la section 12 du cahier des charges.
Statut : OK / KO / À faire / Sans objet.
Les tests S1 à S9 sont réalisés avec `node backend/test-sms.js` (sans base de données) et le simulateur Africa's Talking Sandbox.

| N° | Scénario | Résultat attendu | Résultat obtenu | Statut | Capture |
|----|----------|------------------|-----------------|--------|---------|
| S1 | SMS de confirmation en mode simulation | statut `simulation`, message affiché dans le terminal, rien envoyé | statut `simulation`, message affiché, numéro 655171889 transformé en +237655171889 | OK | |
| S2 | SMS de confirmation en Sandbox | statut `reussite`, référence fournisseur, SMS visible dans le simulateur | statut `reussite`, référence ATXid_..., SMS reçu dans le simulateur | OK | sms-4-types-sandbox.png |
| S3 | SMS de refus avec motif prédéfini | message avec « Motif : ... », statut `reussite` | « ...refusée. Motif : médecin indisponible. », statut `reussite`, SMS reçu | OK | sms-4-types-sandbox.png |
| S4 | SMS d'annulation avec motif prédéfini | message avec « Motif : ... », statut `reussite` | « ...annulé. Motif : demande incomplète. », statut `reussite`, SMS reçu | OK | sms-4-types-sandbox.png, sms-4-types-sandbox-2.png |
| S5 | SMS de rappel | message « rappel ... demain », statut `reussite` | « rappel de votre rendez-vous prévu demain à 09:30 », statut `reussite`, SMS reçu | OK | sms-4-types-sandbox-2.png |
| S6 | Numéro invalide (12345) | statut `echec`, aucun envoi, pas de plantage | « Numéro invalide : +23712345 », statut `echec`, aucun plantage | OK | |
| S7 | Clé API absente | statut `echec`, message « AT_API_KEY manquante » | « AT_API_KEY manquante dans .env », statut `echec`, aucun plantage | OK | |
| S8 | Motif de plus de 60 caractères | motif coupé dans le SMS | Sans objet : le motif est une valeur prédéfinie (médecin indisponible, demande incomplète, autre motif), aucun texte libre n'atteint le SMS | Sans objet | |
| S9 | Contenu du SMS | aucun nom de médecin, de service ni de symptôme | Les 4 messages reçus ne contiennent ni médecin, ni service, ni symptôme | OK | sms-4-types-sandbox.png, sms-4-types-sandbox-2.png |
| S10 | Échec du SMS | la confirmation du RDV n'est pas bloquée (avec la base du Rôle 2) | | À faire | |
| S11 | Journal des envois | chaque envoi (réussite, échec, simulation) est enregistré dans la table `notification` | | À faire | |
| S12 | Rappel 24h avant (node-cron) | un seul rappel envoyé, uniquement pour les RDV confirmés | | À faire | |