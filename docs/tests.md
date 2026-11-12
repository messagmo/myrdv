# Tests MyRDV : module SMS (Rôle 4)

À rapprocher des scénarios de la section 12 du cahier des charges.
Statut : OK / KO / À faire.

| N° | Scénario | Résultat attendu | Résultat obtenu | Statut | Capture |
|----|----------|------------------|-----------------|--------|---------|
| S1 | SMS de confirmation en mode simulation | statut `simulation`, ligne dans le journal | statut `simulation`, ligne ajoutée dans notifications.jsonl, aucun SMS envoyé | OK | |
| S2 | SMS de confirmation en Sandbox | statut `reussite`, SMS visible dans le simulateur | SMS reçu dans le simulateur | OK | sms-confirmation-sandbox.png |
| S3 | SMS de refus avec motif bref | message avec « Motif : ... », statut `reussite` | SMS reçu : « ...refusée. Motif : créneau déjà pris. » | OK | sms-4-types-sandbox.png |
| S4 | SMS d'annulation avec motif | message avec « Motif : ... », statut `reussite` | SMS reçu : « ...annulé. Motif : médecin indisponible. » | OK | sms-4-types-sandbox.png |
| S5 | SMS de rappel | message « rappel ... demain », statut `reussite` | SMS reçu : « rappel, vous avez un rendez-vous demain à 09:30. » | OK | sms-4-types-sandbox.png |
| S6 | Numéro invalide (sans +237) | statut `echec`, erreur journalisée, pas de plantage | statut `echec`, « Numéro invalide », ligne journalisée, aucun plantage | OK | |
| S7 | Clé API absente | statut `echec`, message « AT_API_KEY manquante » | statut `echec`, « AT_API_KEY manquante dans .env », ligne journalisée, aucun plantage | OK | |
| S8 | Motif de plus de 60 caractères | motif coupé à 60 caractères dans le SMS | motif de 100 caractères coupé à 60 dans le message généré | OK | |
| S9 | Contenu du SMS | aucun nom de médecin, de service ni de symptôme | Les 4 SMS reçus ne contiennent ni médecin, ni service, ni symptôme | OK | sms-4-types-sandbox.png |
| S10 | Échec du SMS | la confirmation du RDV n'est pas bloquée (test avec le Rôle 2) | | À faire | |
| S11 | Journal | chaque envoi (réussite, échec, simulation) est enregistré | Journal contenant les statuts `reussite` (avec référence fournisseur), `simulation` et `echec` | OK | |
| S12 | Rappel 24h avant (node-cron) | un seul rappel envoyé, uniquement pour les RDV confirmés | | À faire | |
