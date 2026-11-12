# MyRDV : Backend (Rôle 2)

**Guide de démarrage et méthode de test**

Ce document explique comment installer, lancer et vérifier le Backend de MyRDV (API REST en Node.js/Express avec PostgreSQL). Il s'adresse à toute l'équipe : les Rôles 1 et 3 y trouvent les routes à appeler, le Rôle 4 les points où brancher les notifications SMS.

---

## 1. Ce que fait le Backend

Le Backend applique les règles de gestion de la section 6 du cahier des charges et expose l'API de la section 9 :

- inscription et connexion des patients, connexion du personnel (jeton de connexion et contrôle des rôles) ;
- consultation des services, des médecins et des créneaux disponibles ;
- création, consultation et annulation des demandes de rendez-vous ;
- confirmation ou refus d'une demande par le personnel, avec un motif prédéfini en cas de refus ou d'annulation par le personnel.

Le module SMS (Africa's Talking Sandbox) et le rappel planifié sont à la charge du Rôle 4. Les emplacements prévus sont marqués par des commentaires `Rôle 4` dans `src/business/rendezVous.js`.

---

## 2. Prérequis

| Outil | Remarque |
| --- | --- |
| Node.js (version LTS) | https://nodejs.org : garder « Add to PATH » coché, puis redémarrer VS Code |
| PostgreSQL et pgAdmin | Retenir le mot de passe de l'utilisateur `postgres` |
| Git | https://git-scm.com |
| Visual Studio Code | Éditeur recommandé |
| Thunder Client | Extension de VS Code pour tester l'API |

**Windows / PowerShell.** Si `npm` répond que l'exécution de scripts est désactivée, exécuter une seule fois :

```
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

Vérification : `node -v` et `npm -v` doivent afficher chacun un numéro de version.

---

## 3. Mise en route

### 3.1 Récupérer le code

```
git clone <lien-du-dépôt>
cd <nom-du-dépôt>
git checkout role2-backend
git pull
cd backend
```

### 3.2 Installer les paquets

```
npm install
```

### 3.3 Configurer l'environnement

Copier le modèle, puis ouvrir `.env` et renseigner les valeurs :

```
copy .env.example .env
```

```
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=myrdv
DB_USER=postgres
DB_PASSWORD=<mot de passe PostgreSQL>
JWT_SECRET=<longue phrase secrète de votre choix>
JWT_EXPIRES_IN=8h
```

Règles à respecter :

- pas d'espace autour du `=` et pas de guillemets ;
- le fichier `.env` ne doit **jamais** être publié sur Git (il est ignoré par le `.gitignore`) ;
- `.env.example` est un modèle partagé : ne jamais y écrire de vraies valeurs.

### 3.4 Créer la base de données

Avec pgAdmin : clic droit sur **Databases** → *Create* → *Database*, nom `myrdv`. Puis clic droit sur `myrdv` → *Query Tool*, ouvrir `db/schema_myrdv.sql` et l'exécuter (flèche ▶).

Ou en terminal :

```
psql -U postgres
CREATE DATABASE myrdv;
\q
psql -U postgres -d myrdv -f db/schema_myrdv.sql
```

Vérification : la base `myrdv` doit contenir 7 tables (`patient`, `personnel`, `service`, `medecin`, `creneau`, `rendez_vous`, `notification`). Le script fixe aussi le fuseau horaire de la base sur `Africa/Douala`.

### 3.5 Créer les comptes et données de démonstration (fictifs)

```
node scripts/creer_admin.js
node scripts/donnees_demo.js
```

- `creer_admin.js` crée le compte du personnel : identifiant `admin`, mot de passe `admin12345`.
- `donnees_demo.js` crée 3 services, 3 médecins et des créneaux (08:00, 09:00 et 10:00) pour les 5 jours suivants. Il ne fait rien si des médecins existent déjà.

Ces données sont fictives et destinées uniquement à la démonstration. Aucune information médicale réelle ne doit être utilisée.

### 3.6 Lancer le serveur

```
npm run dev
```

Le terminal doit afficher : `MyRDV API démarrée sur le port 3000`. Ouvrir `http://localhost:3000/api/health` : la réponse attendue est `{"statut":"ok"}`.

Après toute modification du fichier `.env`, arrêter le serveur (Ctrl+C) et relancer `npm run dev`.

---

## 4. Organisation du code

```
backend/
├── db/schema_myrdv.sql        Schéma PostgreSQL
├── scripts/                   Compte admin et données de démonstration
└── src/
    ├── server.js, app.js      Démarrage et configuration Express
    ├── config/                Connexion PostgreSQL
    ├── middleware/            Authentification, rôles, gestion des erreurs
    ├── routes/                Routes de l'API
    ├── business/              Règles de gestion
    ├── data/                  Requêtes SQL (seule couche qui accède à la base)
    ├── sms/                   Module SMS (Rôle 4)
    └── jobs/                  Rappel planifié (Rôle 4)
```

---

## 5. Routes disponibles

Toutes les routes, sauf l'inscription et la connexion, exigent l'en-tête `Authorization: Bearer <jeton>`.

| Méthode et route | Accès | Fonction |
| --- | --- | --- |
| `GET /api/health` | Public | Vérifier que le serveur répond |
| `POST /api/auth/register` | Public | Créer un compte patient |
| `POST /api/auth/login` | Public | Connexion patient ou personnel |
| `GET /api/services` | Patient, personnel | Lister les services |
| `GET /api/doctors` | Patient, personnel | Lister les médecins (`?service_id=`) |
| `GET /api/slots` | Patient, personnel | Lister les créneaux (`?medecin_id=&date=AAAA-MM-JJ`) |
| `POST /api/appointments` | Patient | Demander un rendez-vous |
| `GET /api/appointments/me` | Patient | Lister ses rendez-vous |
| `POST /api/appointments/:id/cancel` | Patient propriétaire, personnel | Annuler un rendez-vous |
| `PATCH /api/appointments/:id/status` | Personnel | Confirmer ou refuser une demande |

### Corps des requêtes

**Inscription** (`POST /api/auth/register`) :

```json
{"nom":"Test","prenom":"Fictif","telephone":"670000000","mot_de_passe":"motdepasse1"}
```

Le champ `email` est facultatif. Le téléphone contient de 8 à 15 chiffres (un `+` initial est accepté) et le mot de passe au moins 8 caractères.

**Connexion** (`POST /api/auth/login`) :

```json
{"identifiant":"670000000","mot_de_passe":"motdepasse1"}
```

Pour le personnel, ajouter `"profil":"personnel"` et utiliser l'identifiant du compte (par exemple `admin`).

**Demande de rendez-vous** (`POST /api/appointments`) :

```json
{"creneau_id": 3, "motif_demande": "facultatif, non sensible"}
```

Le médecin est déduit du créneau côté serveur.

**Annulation par le personnel** et **refus** : un motif de la liste est obligatoire :

```json
{"motif_decision":"medecin_indisponible"}
```

```json
{"statut":"refuse","motif_decision":"demande_incomplete"}
```

Motifs autorisés : `medecin_indisponible`, `demande_incomplete`, `autre`. Ils restent non médicaux.

**Confirmation** : `{"statut":"confirme"}`.

### Règles appliquées par le serveur

- Un patient ne voit et n'annule que ses propres rendez-vous.
- Le patient ne voit que les services et médecins actifs, et les créneaux futurs, disponibles et sans rendez-vous confirmé. Le personnel voit tout.
- Une demande est créée avec le statut `en_attente`.
- Un créneau ne peut pas être confirmé pour deux patients (contrôle dans le code et index unique en base).
- Seules les demandes `en_attente` peuvent être confirmées ou refusées. Seuls les rendez-vous `en_attente` ou `confirme` peuvent être annulés.
- Un rendez-vous annulé ou refusé ne bloque plus le créneau.

---

## 6. Méthode de test

Les tests se font avec Thunder Client (icône en forme d'éclair dans VS Code). Les codes indiqués sont les codes HTTP attendus.

### 6.1 Principe

1. Utiliser **deux requêtes de connexion**, une pour le patient et une pour l'admin, afin de ne pas mélanger les jetons.
2. Copier le `token` de la réponse (le texte long, sans les guillemets).
3. Dans la requête à tester : onglet **Auth** → **Bearer** → coller le jeton.
4. Pour les corps de requête : onglet **Body** → **JSON**.
5. Le jeton expire après 8 heures : en cas de `401`, se reconnecter.
6. Les numéros `<id>` dans les adresses sont ceux renvoyés par l'API (créneaux via `GET /api/slots`, rendez-vous à la création ou via `GET /api/appointments/me`).

Dans la suite, **P** désigne le jeton du patient et **A** celui de l'admin.

### 6.2 Préparation

| Étape | Requête | Attendu |
| --- | --- | --- |
| 1 | `GET /api/health` | 200 |
| 2 | `POST /api/auth/register` (patient de démonstration, voir 5) | 201, avec `patient` et `token` |
| 3 | `POST /api/auth/login` patient | 200, noter le jeton **P** |
| 4 | `POST /api/auth/login` admin (`"profil":"personnel"`) | 200, noter le jeton **A** |

Pour vérifier le hachage des mots de passe, dans pgAdmin : `SELECT telephone, mot_de_passe_hashe FROM patient;`. La colonne doit contenir un texte illisible commençant par `$2a$`, jamais le mot de passe en clair.

### 6.3 Authentification

| Test | Requête | Attendu |
| --- | --- | --- |
| Inscription en double | Même `register` une seconde fois | 409 |
| Téléphone invalide | `register` avec `"telephone":"123"` | 400 |
| Mot de passe trop court | `register` avec 5 caractères | 400 |
| Mauvais mot de passe | `login` avec `"mot_de_passe":"faux"` | 401 |

### 6.4 Consultation

| Test | Requête | Attendu |
| --- | --- | --- |
| Sans jeton | `GET /api/services` sans Auth | 401 |
| Services | `GET /api/services` avec **P** | 200 |
| Médecins | `GET /api/doctors` avec **P** | 200 |
| Créneaux | `GET /api/slots` avec **P** | 200, noter l'`id` d'un créneau libre |
| Date invalide | `GET /api/slots?date=12-11-2026` avec **P** | 400 |

### 6.5 Demande, liste et annulation par le patient

| Test | Requête | Attendu |
| --- | --- | --- |
| Création | `POST /api/appointments` avec **P**, `{"creneau_id": <id>}` | 201, statut `en_attente` |
| Doublon | La même requête | 409 |
| Mes rendez-vous | `GET /api/appointments/me` avec **P** | 200, avec le rendez-vous |
| Interdit au personnel | `POST /api/appointments` avec **A** | 403 |
| Annulation | `POST /api/appointments/<id>/cancel` avec **P** | 200, statut `annule` |
| Annulation répétée | La même requête | 409 |
| Rendez-vous d'un autre patient | `cancel` avec le jeton d'un second patient | 404 |

### 6.6 Décision du personnel

Créer d'abord une demande avec **P** (`201`) et noter son `id`.

| Test | Requête (méthode **PATCH**, jeton **A**) | Attendu |
| --- | --- | --- |
| Confirmation | `/api/appointments/<id>/status`, `{"statut":"confirme"}` | 200, statut `confirme` |
| Confirmation répétée | La même requête | 409 |
| Créneau retiré de la liste | `GET /api/slots` avec **P** | Le créneau confirmé n'apparaît plus |
| Refus sans motif | `{"statut":"refuse"}` sur une autre demande | 400 |
| Motif hors liste | `{"statut":"refuse","motif_decision":"autre chose"}` | 400 |
| Refus valide | `{"statut":"refuse","motif_decision":"demande_incomplete"}` | 200, statut `refuse` |
| Statut inconnu | `{"statut":"accepte"}` | 400 |
| Interdit au patient | La même route avec **P** | 403 |
| Sans jeton | La même route sans Auth | 401 |
| Motif visible du patient | `GET /api/appointments/me` avec **P** | 200, motif affiché sur le rendez-vous refusé |

### 6.7 Annulation par le personnel

| Test | Requête (jeton **A**) | Attendu |
| --- | --- | --- |
| Sans motif | `POST /api/appointments/<id>/cancel` sans corps | 400 |
| Motif valide | Corps `{"motif_decision":"medecin_indisponible"}` | 200, statut `annule` |

### 6.8 Un créneau, deux patients

1. Inscrire un second patient (téléphone `670000001`) et noter son jeton **P2**.
2. Avec **P** puis **P2**, demander le même créneau : `201` chacune, deux demandes `en_attente`.
3. Avec **A**, confirmer la première : `200`.
4. Avec **A**, confirmer la seconde : `409` (le créneau n'est plus disponible).

C'est la règle « un créneau ne peut pas être confirmé pour deux patients ».

---

## 7. Dépannage

| Symptôme | Cause probable | Solution |
| --- | --- | --- |
| `npm` n'est pas reconnu | Node.js absent du PATH | Installer Node.js, redémarrer VS Code ou l'ordinateur |
| Scripts désactivés dans PowerShell | Politique d'exécution | Commande de la section 2 |
| `auth_failed` dans le terminal du serveur | `DB_PASSWORD` incorrect dans `.env` | Corriger le mot de passe, relancer le serveur |
| `database "myrdv" does not exist` | Base non créée | Section 3.4 |
| `relation "patient" does not exist` | Script SQL non exécuté | Exécuter `db/schema_myrdv.sql` |
| `port 3000 already in use` | Un autre serveur tourne | Ctrl+C dans l'autre terminal, puis relancer |
| 404 « Route introuvable » | Mauvaise méthode ou adresse | Vérifier la méthode (GET, POST, PATCH) et l'adresse |
| 401 | Jeton absent, expiré ou invalide | Se reconnecter et recoller le jeton |
| 403 | Rôle non autorisé pour cette route | Utiliser le jeton du bon profil |
| 500 « Une erreur est survenue » | Erreur côté serveur | Lire le message affiché dans le terminal du serveur |

---

## 8. Sécurité et bonnes pratiques

- Ne jamais publier `.env`, ni aucune clé (notamment la clé API Africa's Talking, qui reste côté serveur dans une variable d'environnement).
- Les comptes et données de démonstration sont fictifs : le mot de passe `admin12345` ne doit pas être utilisé en dehors du prototype.
- Les messages et motifs ne contiennent aucune information médicale sensible.
- Travailler sur sa propre branche, intégrer régulièrement dans `dev`.
