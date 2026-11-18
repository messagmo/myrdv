// ============================================================
// api.js : fichier commun à toutes les pages de l'espace admin
// Contenu :
//   1. la configuration (adresse de l'API, libellés)
//   2. apiFetch() : la fonction qui parle au serveur du Rôle 2
//   3. la session : garde(), deconnexion()
//   4. de petites fonctions d'affichage : creer(), formatDate(), msg()
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

// Crée un élément HTML. Exemple : creer("span", "Bonjour", "tag")
// On utilise textContent (jamais innerHTML) : le texte est affiché tel quel,
// ce qui empêche l'injection de code malveillant.
function creer(balise, texte, classe) {
  const element = document.createElement(balise);
  if (texte !== undefined) element.textContent = texte;
  if (classe) element.className = classe;
  return element;
}

// "2026-11-20" devient "20/11/2026"
function formatDate(date) {
  const [a, m, j] = String(date).slice(0, 10).split("-");
  return j + "/" + m + "/" + a;
}

// Affiche un message dans la zone <div id="msg"> pendant 5 secondes.
// type = "ok" (vert) ou "err" (rouge). Mêmes styles que l'application patient.
function msg(texte, type = "ok") {
  const zone = document.querySelector("#msg");
  zone.textContent = texte;
  zone.className = type === "err" ? "error" : "success";
  zone.setAttribute("role", type === "err" ? "alert" : "status");
  clearTimeout(msg.minuteur);
  msg.minuteur = setTimeout(function () { zone.textContent = ""; zone.className = ""; }, 5000);
}

// Pages protégées : bouton « Se déconnecter » et nom de la personne connectée
document.querySelectorAll("[data-logout]").forEach(function (bouton) { bouton.addEventListener("click", deconnexion); });
const nomConnecte = (JSON.parse(sessionStorage.getItem("user") || "null") || {}).nom;
if (nomConnecte && document.querySelector("#qui")) document.querySelector("#qui").textContent = "Espace administration · " + nomConnecte;
