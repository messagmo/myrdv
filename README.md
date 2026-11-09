# MyRDV

Application web de prise de rendez-vous médicaux (projet d'équipe, démonstration).

## Stack technique

- Interface : HTML, CSS, JavaScript (responsive, utilisable sur téléphone Android)
- Backend : Node.js + Express (API REST)
- Base de données : PostgreSQL
- SMS : Africa's Talking Sandbox
- Rappel planifié : node-cron

## Structure du dépôt

- `backend/` : API et base de données (Rôle 2)
- `frontend-patient/` : application web patient (Rôle 1)
- `frontend-admin/` : espace administration (Rôle 3)
- `docs/` : maquettes, schéma de données, tests, captures (Rôle 4)

## Lancer le projet

1. Copier `.env.example` en `.env` et remplir les valeurs
2. Installer les dépendances : `cd backend && npm install`
3. Lancer le serveur : `npm start`

(À compléter par le Rôle 2 quand le backend existe.)

## Règles d'équipe

- Une branche par personne : `role1-patient`, `role2-backend`, `role3-admin`, `role4-sms-tests`
- On travaille sur sa branche, jamais directement sur `main`
- On fusionne dans `dev` au moins une fois par jour
- `main` ne reçoit que du code testé et stable (version de démo)
- Données de démonstration fictives uniquement
- Aucune information médicale sensible, ni dans l'application ni dans les SMS
- La clé API n'est jamais dans le code de l'interface web ni dans Git
- Le fichier `.env` n'est jamais envoyé sur GitHub

## Équipe

- Rôle 1 : application web patient - MBOGOL Yves Bertrand Stephane 
- Rôle 2 : backend et base de données - BELLA NDJANA Muriel Daina
- Rôle 3 : espace administration - ESSAMA Axel Merlin
- Rôle 4 : SMS, tests, documentation - MESSAGMO WAMBA Mireille Clara
