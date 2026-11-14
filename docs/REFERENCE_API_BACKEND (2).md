# MyRDV : Référence de l'API

**Document destiné au Rôle 1 (application web patient) et au Rôle 3 (espace administration)**

Ce document décrit toutes les routes du Backend : ce qu'il faut envoyer, ce qu'on reçoit, et les erreurs possibles. Les exemples de réponses proviennent de vraies réponses de l'API, avec des données fictives.

---

## 1. Généralités

| Point | Valeur |
| --- | --- |
| Adresse de base (développement) | `http://localhost:3000/api` |
| Format des échanges | JSON, avec l'en-tête `Content-Type: application/json` |
| Authentification | En-tête `Authorization: Bearer <jeton>` |
| Durée du jeton | 8 heures, puis il faut se reconnecter |
| Accès depuis un autre port | Autorisé (CORS ouvert en développement) |

### Rôles

| Rôle | Valeur renvoyée à la connexion |
| --- | --- |
| Patient | `patient` |
| Administrateur | `administrateur` |
| Agent d'accueil | `agent_accueil` |

Dans ce document, **personnel** désigne l'administrateur et l'agent d'accueil, qui ont les mêmes droits.

### Formats

- **Date** : `AAAA-MM-JJ` (exemple : `2026-11-20`).
- **Heure** : `HH:MM` sur 24 heures (exemple : `14:00`).
- **date_creation** d'un rendez-vous : `AAAA-MM-JJ HH:MM`, heure de Douala.
- Les identifiants (`id`) sont des nombres entiers.

### Erreurs

Toute erreur renvoie un code HTTP et un message prêt à être affiché à l'utilisateur :

```json
{ "message": "Un compte existe déjà avec ce numéro de téléphone." }
```

| Code | Signification | Que faire dans l'interface |
| --- | --- | --- |
| 400 | Données invalides | Afficher le message près du formulaire |
| 401 | Non connecté, ou jeton expiré | Renvoyer vers la page de connexion |
| 403 | Rôle non autorisé pour cette route | Ne pas afficher cette fonction à ce profil |
| 404 | Élément ou route introuvable | Afficher le message |
| 409 | Conflit (doublon, créneau pris, demande déjà traitée) | Afficher le message et recharger les données |
| 500 | Erreur du serveur | Afficher « Une erreur est survenue. Veuillez réessayer. » |

---

## 2. Résumé des routes

| Méthode et route | Accès | Fonction |
| --- | --- | --- |
| `POST /auth/register` | Public | Créer un compte patient |
| `POST /auth/login` | Public | Connexion patient ou personnel |
| `GET /services` | Tous (connectés) | Lister les services |
| `POST /services` | Personnel | Ajouter un service |
| `PATCH /services/:id` | Personnel | Modifier ou désactiver un service |
| `GET /doctors` | Tous (connectés) | Lister les médecins |
| `POST /doctors` | Personnel | Ajouter un médecin |
| `PATCH /doctors/:id` | Personnel | Modifier ou désactiver un médecin |
| `GET /slots` | Tous (connectés) | Lister les créneaux |
| `POST /slots` | Personnel | Créer un créneau |
| `PATCH /slots/:id` | Personnel | Modifier un créneau |
| `POST /appointments` | Patient | Demander un rendez-vous |
| `GET /appointments/me` | Patient | Lister ses rendez-vous |
| `GET /appointments` | Personnel | Lister tous les rendez-vous (filtres) |
| `PATCH /appointments/:id/status` | Personnel | Confirmer ou refuser une demande |
| `POST /appointments/:id/cancel` | Patient propriétaire, personnel | Annuler un rendez-vous |
| `POST /notifications/test` | Personnel | Envoyer un SMS d'essai |
| `GET /notifications` | Personnel | Journal des SMS envoyés |

---

## 3. Authentification

### `POST /auth/register` : créer un compte patient

Corps :

```json
{
  "nom": "Test",
  "prenom": "Fictif",
  "telephone": "670000000",
  "email": "facultatif@exemple.com",
  "mot_de_passe": "motdepasse1"
}
```

| Champ | Règle |
| --- | --- |
| `nom`, `prenom` | Obligatoires |
| `telephone` | Obligatoire, de 8 à 15 chiffres (un `+` initial est accepté), unique |
| `email` | Facultatif, adresse valide |
| `mot_de_passe` | Obligatoire, au moins 8 caractères |

Réponse **201** :

```json
{
  "patient": { "id": 1, "nom": "Test", "prenom": "Fictif", "telephone": "670000000", "email": null },
  "token": "<jeton>"
}
```

Le patient est connecté dès l'inscription : conserver le `token`.

Erreurs : **400** (« Le nom et le prénom sont obligatoires. », « Numéro de téléphone invalide. », « Adresse e-mail invalide. », « Le mot de passe doit contenir au moins 8 caractères. »), **409** (« Un compte existe déjà avec ce numéro de téléphone. »).

### `POST /auth/login` : connexion

Patient (l'identifiant est le numéro de téléphone) :

```json
{ "identifiant": "670000000", "mot_de_passe": "motdepasse1" }
```

Personnel (ajouter `"profil": "personnel"`) :

```json
{ "identifiant": "admin", "mot_de_passe": "admin12345", "profil": "personnel" }
```

Réponse **200** (patient) :

```json
{
  "utilisateur": { "id": 1, "nom": "Test", "prenom": "Fictif", "role": "patient" },
  "token": "<jeton>"
}
```

Réponse **200** (personnel) :

```json
{
  "utilisateur": { "id": 1, "nom": "Administrateur Démo", "role": "administrateur" },
  "token": "<jeton>"
}
```

Le champ `role` indique quel espace afficher. Erreurs : **400** (identifiant ou mot de passe manquant), **401** (« Identifiant ou mot de passe incorrect. »).

---

## 4. Consultation (patient et personnel)

Ces routes exigent un jeton. Le **patient** ne voit que ce qui est actif et réservable ; le **personnel** voit tout, y compris les éléments désactivés.

### `GET /services`

Réponse **200** :

```json
[
  { "id": 3, "nom": "Cardiologie", "description_courte": "Consultations du coeur et des vaisseaux", "statut": "actif" },
  { "id": 1, "nom": "Médecine générale", "description_courte": "Consultations générales", "statut": "actif" }
]
```

### `GET /doctors`

Paramètre facultatif : `?service_id=1`.

Réponse **200** :

```json
[
  { "id": 1, "nom": "Dr Démo Alpha", "service_id": 1, "service": "Médecine générale", "statut": "actif" }
]
```

Le patient ne voit que les médecins actifs d'un service actif.

### `GET /slots`

Paramètres facultatifs : `?medecin_id=1` et `?date=2026-11-20`.

Réponse **200** :

```json
[
  {
    "id": 1,
    "medecin_id": 1,
    "medecin": "Dr Démo Alpha",
    "date": "2026-11-15",
    "heure_debut": "08:00",
    "heure_fin": "09:00",
    "statut": "disponible"
  }
]
```

Le patient ne voit que les créneaux **futurs**, au statut `disponible`, d'un médecin actif et sans rendez-vous déjà confirmé. Le personnel voit tous les créneaux.

Erreurs : **400** (« Date invalide (format attendu : AAAA-MM-JJ). », « Paramètre « medecin_id » invalide. »).

---

## 5. Rendez-vous côté patient

### `POST /appointments` : demander un rendez-vous (patient)

Corps :

```json
{ "creneau_id": 1, "motif_demande": "controle" }
```

`motif_demande` est facultatif (255 caractères maximum). Il doit rester **non sensible** : prévenir le patient dans le formulaire de ne saisir aucune information médicale. Le médecin est déduit du créneau, il ne faut pas l'envoyer.

Réponse **201** :

```json
{ "id": 1, "creneau_id": 1, "statut": "en_attente", "motif_demande": "controle" }
```

Erreurs : **400** (« Veuillez choisir un créneau. »), **404** (« Créneau introuvable. »), **409** (« Ce créneau n'est plus disponible. », « Vous avez déjà une demande pour ce créneau. »).

### `GET /appointments/me` : mes rendez-vous (patient)

Réponse **200** :

```json
[
  {
    "id": 1,
    "statut": "en_attente",
    "date_creation": "2026-11-14 19:32",
    "medecin": "Dr Démo Alpha",
    "service": "Médecine générale",
    "date": "2026-11-15",
    "heure_debut": "08:00",
    "heure_fin": "09:00",
    "motif_demande": "controle",
    "motif_decision": null
  }
]
```

Les rendez-vous sont triés du plus récent au plus ancien. `motif_decision` est renseigné quand le personnel a refusé ou annulé : à afficher au patient.

### `POST /appointments/:id/cancel` : annuler (patient propriétaire)

Aucun corps. Réponse **200** :

```json
{ "id": 1, "statut": "annule", "motif_decision": null }
```

Seuls les rendez-vous `en_attente` ou `confirme` peuvent être annulés. Erreurs : **404** (« Rendez-vous introuvable. », y compris pour le rendez-vous d'un autre patient), **409** (« Ce rendez-vous ne peut plus être annulé. »).

Aucun SMS n'est envoyé au patient quand il annule lui-même son rendez-vous.

---

## 6. Espace administration (personnel)

### Rendez-vous

#### `GET /appointments` : tableau de bord

Paramètres facultatifs, combinables : `?date=2026-11-15`, `?medecin_id=1`, `?statut=en_attente`.

Réponse **200** :

```json
[
  {
    "id": 2,
    "statut": "annule",
    "date_creation": "2026-11-14 19:32",
    "patient_nom": "Test",
    "patient_prenom": "Fictif",
    "patient_telephone": "670000000",
    "medecin_id": 1,
    "medecin": "Dr Démo Alpha",
    "service": "Médecine générale",
    "date": "2026-11-15",
    "heure_debut": "09:00",
    "heure_fin": "10:00",
    "motif_demande": null,
    "motif_decision": "medecin_indisponible"
  }
]
```

Tri par date et heure du créneau. Erreurs : **400** (« Statut invalide : en_attente, confirme, refuse ou annule. », « Date invalide… »).

#### `PATCH /appointments/:id/status` : confirmer ou refuser

Confirmer :

```json
{ "statut": "confirme" }
```

Refuser (le motif est obligatoire) :

```json
{ "statut": "refuse", "motif_decision": "demande_incomplete" }
```

Réponse **200** :

```json
{ "id": 3, "statut": "refuse", "motif_decision": "demande_incomplete" }
```

Seule une demande `en_attente` peut être décidée. Erreurs :

- **400** : « Statut invalide : « confirme » ou « refuse ». » ou « Motif obligatoire : medecin_indisponible, demande_incomplete, autre. »
- **404** : « Rendez-vous introuvable. »
- **409** : « Cette demande a déjà été traitée. », « Ce créneau n'est plus disponible. », « Ce créneau est déjà confirmé pour un autre patient. »

#### `POST /appointments/:id/cancel` : annuler (personnel)

Le motif est obligatoire :

```json
{ "motif_decision": "medecin_indisponible" }
```

Réponse **200** :

```json
{ "id": 2, "statut": "annule", "motif_decision": "medecin_indisponible" }
```

### Services

`POST /services` (réponse **201**) :

```json
{ "nom": "Radiologie", "description_courte": "Imagerie médicale" }
```

```json
{ "id": 4, "nom": "Radiologie", "description_courte": "Imagerie médicale", "statut": "actif" }
```

`PATCH /services/:id` : envoyer uniquement les champs à changer (`nom`, `description_courte`, `statut`). Pour désactiver :

```json
{ "statut": "inactif" }
```

Réponse **200** : le service mis à jour. Erreurs : **400** (nom manquant, statut inconnu, « Aucune modification fournie. »), **404** (« Service introuvable. »), **409** (« Un service porte déjà ce nom. »).

### Médecins

`POST /doctors` (réponse **201**) :

```json
{ "nom": "Dr Démo Delta", "service_id": 1 }
```

```json
{ "id": 4, "nom": "Dr Démo Delta", "service_id": 1, "statut": "actif" }
```

`PATCH /doctors/:id` : champs possibles `nom`, `service_id`, `statut` (`actif` ou `inactif`). Erreurs : **400** (« Veuillez choisir un service. », « Aucune modification fournie. »), **404** (« Service introuvable. », « Médecin introuvable. »).

### Créneaux

`POST /slots` (réponse **201**) :

```json
{ "medecin_id": 1, "date": "2026-11-23", "heure_debut": "14:00", "heure_fin": "15:00" }
```

```json
{ "id": 46, "medecin_id": 1, "date": "2026-11-23", "heure_debut": "14:00", "heure_fin": "15:00", "statut": "disponible" }
```

`PATCH /slots/:id` : champs possibles `date`, `heure_debut`, `heure_fin`, `statut` (`disponible` ou `indisponible`) :

```json
{ "statut": "indisponible" }
```

Règles et erreurs :

- La date ne peut pas être dans le passé : **400** « La date du créneau ne peut pas être dans le passé. »
- L'heure de fin doit être après l'heure de début : **400**.
- Format d'heure incorrect : **400** « Heure invalide pour « heure_debut » (format attendu : HH:MM). »
- Un créneau identique pour le même médecin : **409** « Ce créneau existe déjà pour ce médecin. »
- Médecin inexistant : **404** « Médecin introuvable. »
- Un créneau qui a un rendez-vous **confirmé** ne peut pas être modifié : **409** « Ce créneau a un rendez-vous confirmé : annulez-le d'abord. »

### Notifications SMS

Le Backend envoie lui-même les SMS : **l'interface n'a rien à appeler**. Chaque tentative est conservée dans un journal.

| Événement | SMS envoyé au patient | Type enregistré |
| --- | --- | --- |
| Demande confirmée par le personnel | Oui | `confirmation` |
| Demande refusée par le personnel | Oui, avec le motif | `refus` |
| Rendez-vous annulé par le personnel | Oui, avec le motif | `annulation` |
| Rendez-vous annulé par le patient | Non | (aucun) |
| Rappel 24 h avant le rendez-vous | Prévu (Rôle 4) | `rappel` |

Exemple : « MyRDV : votre demande de rendez-vous du 15/11/2026 a été refusée. Motif : demande incomplète. »

Selon la configuration du serveur, le SMS est soit **simulé** (affiché dans le terminal du Backend, mode `simulation`), soit envoyé via Africa's Talking Sandbox (mode `sandbox`). Dans tous les cas, un échec d'envoi **ne modifie jamais** le rendez-vous : la confirmation, le refus ou l'annulation reste enregistré. Les messages ne contiennent aucune information médicale.

#### `POST /notifications/test` : envoyer un SMS d'essai

```json
{ "telephone": "670000000", "message": "MyRDV : essai." }
```

`message` est facultatif (160 caractères maximum). Réponse **200** :

```json
{ "mode": "simulation", "statut_envoi": "simulation", "reference_fournisseur": null }
```

En cas d'échec d'envoi, la réponse reste **200** avec `"statut_envoi": "echec"` et un champ `erreur` décrivant le problème technique. Erreurs : **400** (« Numéro de téléphone invalide. », « Le message est obligatoire (160 caractères maximum). »).

#### `GET /notifications` : journal des envois

Paramètre facultatif : `?rendez_vous_id=1`. Les 50 dernières tentatives, de la plus récente à la plus ancienne. Réponse **200** :

```json
[
  {
    "id": 1,
    "rendez_vous_id": 1,
    "type": "confirmation",
    "statut_envoi": "simulation",
    "date_tentative": "2026-11-14 20:13:17",
    "reference_fournisseur": null
  }
]
```

Erreur : **400** (« Paramètre « rendez_vous_id » invalide. »).

---

## 7. Valeurs à connaître

### Statuts d'un rendez-vous

| Valeur | Libellé suggéré |
| --- | --- |
| `en_attente` | En attente |
| `confirme` | Confirmé |
| `refuse` | Refusé |
| `annule` | Annulé |

### Autres statuts

| Élément | Valeurs |
| --- | --- |
| Service, médecin | `actif`, `inactif` |
| Créneau | `disponible`, `indisponible` |
| Type de notification | `confirmation`, `refus`, `annulation`, `rappel` |
| Résultat d'un envoi de SMS | `reussite`, `echec`, `simulation` |

### Motifs d'un refus ou d'une annulation par le personnel

| Valeur envoyée | Libellé suggéré |
| --- | --- |
| `medecin_indisponible` | Médecin indisponible |
| `demande_incomplete` | Demande incomplète |
| `autre` | Autre motif |

Une liste déroulante dans l'espace administration évite toute erreur de saisie. Ces motifs restent non médicaux.

---

## 8. Parcours conseillés

### Application patient (Rôle 1)

1. **Inscription / connexion** : `POST /auth/register` ou `POST /auth/login`, puis conserver le jeton.
2. **Choix du service** : `GET /services`.
3. **Choix du médecin** : `GET /doctors?service_id=<id>`.
4. **Choix du créneau** : `GET /slots?medecin_id=<id>`, éventuellement avec `date`.
5. **Demande** : `POST /appointments` avec le `creneau_id`.
6. **Suivi** : `GET /appointments/me` pour les statuts et motifs.
7. **Annulation** : `POST /appointments/:id/cancel`.

### Espace administration (Rôle 3)

1. **Connexion** : `POST /auth/login` avec `"profil": "personnel"`.
2. **Tableau de bord** : `GET /appointments`, avec les filtres de la section 6.
3. **Traitement des demandes** : `PATCH /appointments/:id/status` (confirmer ou refuser avec motif).
4. **Gestion de l'offre** : services, médecins et créneaux (section 6).

---

## 9. Exemple d'appel en JavaScript

Fonction à placer dans votre interface web pour appeler l'API en envoyant automatiquement le jeton :

```js
const API = 'http://localhost:3000/api';

async function appel(methode, chemin, corps) {
  const jeton = localStorage.getItem('jeton');
  const reponse = await fetch(API + chemin, {
    method: methode,
    headers: {
      'Content-Type': 'application/json',
      ...(jeton ? { Authorization: 'Bearer ' + jeton } : {}),
    },
    body: corps ? JSON.stringify(corps) : undefined,
  });
  const donnees = await reponse.json();
  if (reponse.status === 401 && jeton) {
    localStorage.removeItem('jeton');   // jeton expiré : retour à la connexion
  }
  if (!reponse.ok) {
    throw new Error(donnees.message);   // message prêt à afficher
  }
  return donnees;
}
```

Utilisation :

```js
// Connexion patient
const connexion = await appel('POST', '/auth/login', {
  identifiant: '670000000',
  mot_de_passe: 'motdepasse1',
});
localStorage.setItem('jeton', connexion.token);

// Liste des services
const services = await appel('GET', '/services');

// Demande de rendez-vous
await appel('POST', '/appointments', { creneau_id: 1 });
```

---

## 10. Bonnes pratiques

- Afficher tel quel le `message` renvoyé en cas d'erreur : il est rédigé pour l'utilisateur.
- Après une erreur **409**, recharger la liste concernée : la situation a changé (créneau pris, demande déjà traitée).
- Ne jamais afficher de bouton d'administration à un patient : le serveur refuse l'action (403), mais l'interface doit l'éviter.
- Utiliser uniquement des données de démonstration **fictives**.
- Ne jamais écrire de clé ou de secret dans le code de l'interface web.
- Les SMS de confirmation, de refus et d'annulation par le personnel sont envoyés automatiquement par le Backend : l'interface n'a rien à appeler. Le rappel 24 h avant est prévu avec le Rôle 4.
- Informer le patient dans l'interface qu'il sera prévenu par SMS au numéro saisi à l'inscription.
