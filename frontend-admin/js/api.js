// ============================================================
// api.js : fichier commun à toutes les pages de l'espace admin
// Contenu :
//   1. la configuration (adresse de l'API, mode démo)
//   2. apiFetch() : la fonction qui parle au serveur du Rôle 2
//   3. la session : garde(), deconnexion()
//   4. de petites fonctions d'affichage : creer(), msg(), entete()
// ============================================================

// Adresse de l'API du Rôle 2 (voir REFERENCE_API_BACKEND.md)
const API = "http://localhost:3000/api";

// MODE DÉMO : true = fausses données, sans serveur.
// Passer à false quand le backend du Rôle 2 est lancé (npm run dev).
const MOCK = false;

// Les motifs de refus / d'annulation acceptés par le serveur
const MOTIFS = {
  medecin_indisponible: "Médecin indisponible",
  demande_incomplete: "Demande incomplète",
  autre: "Autre motif"
};


// ------------------------------------------------------------
// 1. Fausses données (utilisées seulement si MOCK = true)
//    Elles ont la même forme que les vraies réponses de l'API.
// ------------------------------------------------------------
const mockDb = {
  services: [
    { id: 1, nom: "Médecine générale", description_courte: "Consultations générales", statut: "actif" },
    { id: 2, nom: "Cardiologie", description_courte: "Cœur et vaisseaux", statut: "actif" }
  ],
  doctors: [
    { id: 1, nom: "Dr Démo Alpha", service_id: 1, service: "Médecine générale", statut: "actif" },
    { id: 2, nom: "Dr Démo Beta", service_id: 2, service: "Cardiologie", statut: "actif" }
  ],
  slots: [
    { id: 1, medecin_id: 1, medecin: "Dr Démo Alpha", date: "2026-11-20", heure_debut: "08:00", heure_fin: "09:00", statut: "disponible" },
    { id: 2, medecin_id: 2, medecin: "Dr Démo Beta", date: "2026-11-20", heure_debut: "09:00", heure_fin: "10:00", statut: "disponible" },
    { id: 3, medecin_id: 1, medecin: "Dr Démo Alpha", date: "2020-01-10", heure_debut: "08:00", heure_fin: "09:00", statut: "disponible" }   // ancien créneau : ne doit pas s'afficher
  ],
  appointments: [
    { id: 1, statut: "en_attente", patient_nom: "Test", patient_prenom: "Fictif", patient_telephone: "670000000", medecin_id: 1, medecin: "Dr Démo Alpha", service: "Médecine générale", date: "2026-11-20", heure_debut: "08:00", heure_fin: "09:00", motif_demande: "controle", motif_decision: null },
    { id: 2, statut: "confirme", patient_nom: "Exemple", patient_prenom: "Patient", patient_telephone: "670000001", medecin_id: 2, medecin: "Dr Démo Beta", service: "Cardiologie", date: "2026-11-20", heure_debut: "09:00", heure_fin: "10:00", motif_demande: null, motif_decision: null },
    { id: 3, statut: "refuse", patient_nom: "Essai", patient_prenom: "Autre", patient_telephone: "670000002", medecin_id: 1, medecin: "Dr Démo Alpha", service: "Médecine générale", date: "2026-11-21", heure_debut: "10:00", heure_fin: "11:00", motif_demande: null, motif_decision: "demande_incomplete" }
  ]
};

// Imite le serveur : lit, ajoute ou modifie dans mockDb.
function mockFetch(chemin, options) {
  const url = new URL(chemin, "http://exemple");
  const morceaux = url.pathname.split("/");   // "/appointments/3/status" donne ["", "appointments", "3", "status"]
  const nomTable = morceaux[1];
  const id = morceaux[2];
  const action = morceaux[3];
  const methode = options.method || "GET";
  const corps = options.body ? JSON.parse(options.body) : {};

  // Connexion : n'importe quel identifiant et mot de passe sont acceptés en démo
  // Identifiant qui commence par « medecin » = connexion d'un médecin (Dr Démo Alpha, id 1)
  if (nomTable === "auth") {
    const identifiant = String(corps.identifiant || "").toLowerCase();
    const utilisateur = identifiant.startsWith("medecin")
      ? { id: 9, nom: "Dr Démo Alpha", role: "medecin", medecin_id: 1 }
      : { id: 1, nom: "Administrateur Démo", role: "administrateur" };
    return Promise.resolve({ token: "demo", utilisateur: utilisateur });
  }

  const table = mockDb[nomTable];

  // Lecture (avec filtres éventuels : ?statut=...&date=...&medecin_id=...)
  if (methode === "GET") {
    let resultat = table;
    // Un médecin ne voit que ses propres rendez-vous
    const connecte = JSON.parse(sessionStorage.getItem("user") || "null");
    if (nomTable === "appointments" && estMedecin(connecte)) {
      resultat = resultat.filter(function (ligne) { return ligne.medecin_id === connecte.medecin_id; });
    }
    url.searchParams.forEach(function (valeur, cle) {
      if (valeur) {
        resultat = resultat.filter(function (ligne) { return String(ligne[cle]) === valeur; });
      }
    });
    return Promise.resolve(resultat);
  }

  // Ajout
  if (methode === "POST" && !action) {
    const nouvelle = Object.assign({ id: Date.now() }, corps);
    if (nomTable === "slots") {
      nouvelle.statut = "disponible";
      nouvelle.medecin = (mockDb.doctors.find(function (d) { return d.id === nouvelle.medecin_id; }) || {}).nom;
    } else {
      nouvelle.statut = "actif";
      if (nomTable === "doctors") nouvelle.service = (mockDb.services.find(function (s) { return s.id === nouvelle.service_id; }) || {}).nom;
    }
    table.push(nouvelle);
    return Promise.resolve(nouvelle);
  }

  const ligne = table.find(function (l) { return String(l.id) === id; });
  if (!ligne) return Promise.reject(new Error("Élément introuvable."));

  // Décision sur un rendez-vous : confirmer / refuser / annuler
  if (nomTable === "appointments") {
    if (action === "status") {
      if (ligne.statut !== "en_attente") return Promise.reject(new Error("Cette demande a déjà été traitée."));
      if (corps.statut === "refuse" && !MOTIFS[corps.motif_decision]) {
        return Promise.reject(new Error("Motif obligatoire : medecin_indisponible, demande_incomplete, autre."));
      }
      ligne.statut = corps.statut;
      ligne.motif_decision = corps.motif_decision || null;
    } else if (action === "cancel") {
      if (!MOTIFS[corps.motif_decision]) return Promise.reject(new Error("Motif obligatoire : medecin_indisponible, demande_incomplete, autre."));
      ligne.statut = "annule";
      ligne.motif_decision = corps.motif_decision;
    }
    return Promise.resolve(ligne);
  }

  // Modification (PATCH) : on ne change que les champs reçus
  Object.assign(ligne, corps);
  if (nomTable === "doctors") ligne.service = (mockDb.services.find(function (s) { return s.id === ligne.service_id; }) || {}).nom;
  return Promise.resolve(ligne);
}


// ------------------------------------------------------------
// 2. apiFetch : LA fonction pour parler au serveur
//    Exemple : const liste = await apiFetch("/services");
//    En cas d'erreur, elle lance une erreur dont le message
//    est déjà rédigé pour l'utilisateur (voir la référence API).
// ------------------------------------------------------------
async function apiFetch(chemin, options = {}) {
  if (MOCK) return mockFetch(chemin, options);

  // Le jeton prouve au serveur que nous sommes connectés
  const jeton = sessionStorage.getItem("token");
  const entetes = { "Content-Type": "application/json" };
  if (jeton) entetes.Authorization = "Bearer " + jeton;

  let reponse;
  try {
    reponse = await fetch(API + chemin, { ...options, headers: entetes });
  } catch (erreurReseau) {
    throw new Error("Impossible de joindre le serveur. Vérifiez que le backend est lancé.");
  }

  const donnees = await reponse.json().catch(function () { return {}; });

  // 401 = jeton expiré (8 h) : retour à la page de connexion
  if (reponse.status === 401 && jeton) deconnexion();

  if (!reponse.ok) throw new Error(donnees.message || "Une erreur est survenue. Veuillez réessayer.");
  return donnees;
}


// ------------------------------------------------------------
// 3. Session
// ------------------------------------------------------------

// Rôles autorisés à entrer dans cet espace : le personnel (mêmes droits)
// et le médecin, qui utilise le MÊME tableau de bord mais ne voit que ses rendez-vous.
const ROLES_PERSONNEL = ["administrateur", "agent_accueil", "medecin"];

// Vrai si l'utilisateur connecté est un médecin
function estMedecin(utilisateur) {
  return !!utilisateur && utilisateur.role === "medecin";
}

// À appeler en haut de chaque page protégée :
// si on n'est pas connecté en tant que personnel, retour à login.html
function garde() {
  const utilisateur = JSON.parse(sessionStorage.getItem("user") || "null");
  const jeton = sessionStorage.getItem("token");
  if (!jeton || !utilisateur || !ROLES_PERSONNEL.includes(utilisateur.role)) {
    location.href = "login.html";
  }
  return utilisateur;
}

function deconnexion() {
  sessionStorage.clear();
  location.href = "login.html";
}


// ------------------------------------------------------------
// 4. Petites fonctions d'affichage
// ------------------------------------------------------------

// Crée un élément HTML. Exemple : creer("td", "Bonjour", "ma-classe")
// On utilise textContent (jamais innerHTML) : le texte est affiché tel quel,
// ce qui empêche l'injection de code malveillant.
function creer(balise, texte, classe) {
  const element = document.createElement(balise);
  if (texte !== undefined) element.textContent = texte;
  if (classe) element.className = classe;
  return element;
}

// Affiche un message dans la zone <div id="msg"> pendant 4 secondes.
// type = "ok" (vert) ou "err" (rouge)
function msg(texte, type = "ok") {
  const zone = document.querySelector("#msg");
  zone.textContent = texte;
  zone.className = type;
  clearTimeout(msg.minuteur);
  msg.minuteur = setTimeout(function () { zone.className = ""; }, 4000);
}

// Construit la barre du haut (titre, liens, nom, déconnexion)
// pageActive = "dashboard" ou "gestion"
function entete(pageActive) {
  const utilisateur = JSON.parse(sessionStorage.getItem("user") || "{}");

  const titre = creer("h1", "MyRDV");
  titre.append(creer("small", estMedecin(utilisateur) ? "Espace médecin" : "Espace administration"));

  const lienDemandes = creer("a", "Demandes", pageActive === "dashboard" ? "actif" : "");
  lienDemandes.href = "dashboard.html";

  const lienGestion = creer("a", "Gestion", pageActive === "gestion" ? "actif" : "");
  lienGestion.href = "gestion.html";
  // Le médecin n'a pas accès à la gestion (services, médecins, créneaux)
  const liens = estMedecin(utilisateur) ? [lienDemandes] : [lienDemandes, lienGestion];

  const boutonSortie = creer("button", "Déconnexion");
  boutonSortie.addEventListener("click", deconnexion);

  const navigation = creer("nav");
  navigation.append(...liens, creer("span", utilisateur.nom || ""), boutonSortie);

  document.querySelector("#entete").append(titre, navigation);
}
