# Espace administration MyRDV (Rôle 3)

Pages : `login.html` (connexion du personnel), `dashboard.html` (demandes), `gestion.html` (services, médecins, créneaux).

## Lancer
1. Démarrer le backend (`cd backend && npm start`, port 3000).
2. Servir ce dossier, par exemple : `cd frontend-admin && python3 -m http.server 8080`, puis ouvrir `http://localhost:8080/login.html`.
3. Compte de démonstration : `admin` / `admin12345` (créé par `node backend/scripts/creer_admin.js`).

Depuis un téléphone sur le même Wi-Fi : ouvrir `http://<IP-de-l-ordinateur>:8080/login.html` (l'adresse de l'API suit automatiquement).

## Routes utilisées
`POST /auth/login` (profil `personnel`), `GET /appointments` (filtres date, medecin_id), `PATCH /appointments/:id/status`,
`POST /appointments/:id/cancel`, `GET/POST/PATCH` sur `/services`, `/doctors`, `/slots`.
Voir `docs/REFERENCE_API_BACKEND.md`.
