# Tests MyRDV : module SMS (Rôle 4)

À rapprocher des scénarios de la section 12 du cahier des charges.
Statut : OK / KO / À faire.

| N° | Scénario | Résultat attendu | Résultat obtenu | Statut | Capture |
|----|----------|------------------|-----------------|--------|---------|
| S1 | SMS de confirmation en mode simulation | statut `simulation`, ligne dans le journal | | À faire | |
| S2 | SMS de confirmation en Sandbox | statut `reussite`, SMS visible dans le simulateur | SMS reçu dans le simulateur | OK | sms-confirmation-sandbox.png |
| S3 | SMS de refus avec motif bref | message avec « Motif : ... », statut `reussite` | | À faire | |
| S4 | SMS d'annulation avec motif | message avec « Motif : ... », statut `reussite` | | À faire | |
| S5 | SMS de rappel | message « rappel ... demain », statut `reussite` | | À faire | |
| S6 | Numéro invalide (sans +237) | statut `echec`, erreur journalisée, pas de plantage | Échec journalisé | OK | |
| S7 | Clé API absente | statut `echec`, message « AT_API_KEY manquante » | | À faire | |
| S8 | Motif de plus de 60 caractères | motif coupé à 60 caractères dans le SMS | | À faire | |
| S9 | Contenu du SMS | aucun nom de médecin, de service ni de symptôme | | À faire | |
| S10 | Échec du SMS | la confirmation du RDV n'est pas bloquée (test avec le Rôle 2) | | À faire | |
| S11 | Journal | chaque envoi (réussite, échec, simulation) est enregistré | | À faire | |
| S12 | Rappel 24h avant (node-cron) | un seul rappel envoyé, uniquement pour les RDV confirmés | | À faire | |
