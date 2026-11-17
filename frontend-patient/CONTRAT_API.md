# Contrat API attendu par le front-end patient (d'après le cahier des charges, §9)

Base : `http://localhost:3000/api` (à changer dans `js/api.js`, `CONFIG`). Authentification : en-tête `Authorization: Bearer <token>`.
Erreurs : statut HTTP 4xx/5xx avec un JSON `{ "message": "texte lisible" }` (affiché tel quel au patient).
Le front accepte aussi snake_case / camelCase et des listes enveloppées dans `{ data: [...] }`.

| Route | Corps / paramètres | Réponse attendue |
|---|---|---|
| POST /auth/register | `{ nom, prenom, telephone, email?, password }` (téléphone au format `+2376XXXXXXXX`) | `{ token, user: { id, nom, prenom, telephone, role } }` (sinon le front enchaîne avec /auth/login) |
| POST /auth/login | `{ telephone, password }` | `{ token, user: { ..., role } }` — `role` autre que `patient` refusé côté patient |
| GET /services | — | `[ { id, nom, description } ]` |
| GET /doctors | `?service_id=` (facultatif) | `[ { id, nom, service_id } ]` (ou `service_nom`) |
| GET /slots | `?doctor_id=` | créneaux libres : `[ { id, date: "YYYY-MM-DD", start_time: "HH:MM", end_time: "HH:MM" } ]` |
| POST /appointments | `{ doctor_id, slot_id, motif? }` | rendez-vous créé, statut `en_attente` ; erreur 409 si créneau pris |
| GET /appointments/me | — | `[ { id, statut, date, start_time, end_time, doctor_name, service_name, motif, motif_refus? } ]` |
| POST /appointments/:id/cancel | — | rendez-vous annulé ; erreur si les règles de l'établissement l'interdisent |

Statuts : `en_attente`, `confirme`, `refuse`, `annule` (les formes « En attente », « confirmé », « pending »… sont aussi reconnues).
Dates et heures : fuseau Africa/Douala. CORS : le back-end doit autoriser l'origine du front (`cors()` dans Express).
