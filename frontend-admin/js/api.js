// ============================================================
// api.js : fichier commun à toutes les pages de l'espace admin
// Contenu :
//   1. la configuration (adresse de l'API, libellés)
//   2. apiFetch() : la fonction qui parle au serveur du Rôle 2
//   3. la session : garde(), deconnexion()
//   4. de petites fonctions d'affichage : creer(), msg(), entete()
// ============================================================

// ----- 1. Configuration -----

// Adresse de l'API du Rôle 2 (voir docs/REFERENCE_API_BACKEND.md).
// On reprend le nom de la machine qui sert la page : ainsi l'espace admin
// marche aussi depuis un téléphone sur le même réseau Wi-Fi que l'ordinateur.
const API = "http://" + (location.hostname || "localhost") + ":3000/api";

// Seuls l'administrateur et l'agent d'accueil entrent ici (mêmes droits).
const ROLES_PERSONNEL = ["administrateur", "agent_accueil"];

// Texte affiché pour chaque statut de rendez-vous
const LIBELLES = {
  en_attente: "En attente",
  confirme: "Confirmé",
  refuse: "Refusé",
  annule: "Annulé"
};

// Motifs de refus / d'annulation acceptés par le serveur (non médicaux)
const MOTIFS = {
  medecin_indisponible: "Médecin indisponible",
  demande_incomplete: "Demande incomplète",
  autre: "Autre motif"
};


// ----- 2. apiFetch : LA fonction pour parler au serveur -----
//   Exemple : const liste = await apiFetch("/services");
//   En cas d'erreur, elle lance une erreur dont le message est déjà
//   rédigé pour l'utilisateur (voir la référence de l'API).
async function apiFetch(chemin, options = {}) {
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
  // 500 : message générique (le détail technique ne regarde pas l'utilisateur)
  if (reponse.status >= 500) throw new Error("Une erreur est survenue. Veuillez réessayer.");

  if (!reponse.ok) throw new Error(donnees.message || "Une erreur est survenue. Veuillez réessayer.");
  return donnees;
}


// ----- 3. Session -----

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


// ----- 4. Petites fonctions d'affichage -----

// Crée un élément HTML. Exemple : creer("td", "Bonjour", "ma-classe")
// On utilise textContent (jamais innerHTML) : le texte est affiché tel quel,
// ce qui empêche l'injection de code malveillant.
function creer(balise, texte, classe) {
  const element = document.createElement(balise);
  if (texte !== undefined) element.textContent = texte;
  if (classe) element.className = classe;
  return element;
}

// Crée une cellule de tableau. Le « libellé » sert à l'affichage sur téléphone,
// où chaque ligne du tableau devient une carte (voir admin.css).
function cellule(texte, libelle, classe) {
  const td = creer("td", texte, classe);
  td.dataset.label = libelle;
  return td;
}

// "2026-11-20" devient "20/11/2026"
function formatDate(date) {
  const [a, m, j] = String(date).slice(0, 10).split("-");
  return j + "/" + m + "/" + a;
}

// Affiche un message dans la zone <div id="msg"> pendant 5 secondes.
// type = "ok" (vert) ou "err" (rouge)
function msg(texte, type = "ok") {
  const zone = document.querySelector("#msg");
  zone.textContent = texte;
  zone.className = type;
  zone.setAttribute("role", type === "err" ? "alert" : "status");
  clearTimeout(msg.minuteur);
  msg.minuteur = setTimeout(function () { zone.className = ""; }, 5000);
}

// Construit la barre du haut (logo, liens, nom, déconnexion)
// pageActive = "dashboard" ou "gestion"
function entete(pageActive) {
  const utilisateur = JSON.parse(sessionStorage.getItem("user") || "{}");

  const logo = creer("img");
  logo.src = "img/logo.png";
  logo.alt = "";
  const titre = creer("h1", "MyRDV");
  titre.append(creer("small", "Espace administration"));
  const marque = creer("div", undefined, "marque");
  marque.append(logo, titre);

  const lienDemandes = creer("a", "Demandes", pageActive === "dashboard" ? "actif" : "");
  lienDemandes.href = "dashboard.html";
  const lienGestion = creer("a", "Gestion", pageActive === "gestion" ? "actif" : "");
  lienGestion.href = "gestion.html";
  if (pageActive === "dashboard") lienDemandes.setAttribute("aria-current", "page");
  if (pageActive === "gestion") lienGestion.setAttribute("aria-current", "page");

  const boutonSortie = creer("button", "Déconnexion");
  boutonSortie.addEventListener("click", deconnexion);

  const navigation = creer("nav");
  navigation.append(lienDemandes, lienGestion, creer("span", utilisateur.nom || ""), boutonSortie);

  document.querySelector("#entete").append(marque, navigation);
}
