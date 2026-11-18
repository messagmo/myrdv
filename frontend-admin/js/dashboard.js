// ============================================================
// dashboard.js : page « Demandes de rendez-vous »
// Le personnel voit toutes les demandes et peut :
//   - confirmer ou refuser une demande « en attente »
//   - annuler un rendez-vous « confirmé »
// Les SMS au patient sont envoyés automatiquement par le backend :
// cette page n'a rien à faire pour cela.
// Présentation : mêmes cartes, pastilles et étiquettes que l'application patient (Rôle 1).
// ============================================================

garde();   // sécurité : réservé au personnel

const $ = function (selecteur) { return document.querySelector(selecteur); };

// Demandes reçues du serveur (filtrées par date et médecin) ; le statut et
// la recherche de patient sont appliqués ensuite, sans rappeler le serveur.
let demandes = [];
let statutChoisi = "";   // "" = tous les statuts

// Décision en cours dans la fenêtre : { id, type } avec type = "confirmer", "refuser" ou "annuler"
let decisionEnCours = null;


// ----- 1. Charger les demandes -----
async function chargerDemandes() {
  const filtres = new URLSearchParams();
  if ($("#f-date").value) filtres.set("date", $("#f-date").value);
  if ($("#f-med").value) filtres.set("medecin_id", $("#f-med").value);

  // Exemple de chemin obtenu : "/appointments?date=2026-11-20&medecin_id=1"
  let chemin = "/appointments";
  if (filtres.toString() !== "") chemin += "?" + filtres.toString();

  try {
    demandes = await apiFetch(chemin);
    afficher();
  } catch (erreur) {
    $("#list").replaceChildren(creer("div", erreur.message, "error"));
  }
}


// ----- 2. Afficher pastilles + cartes -----
function afficher() {
  afficherPastilles();
  afficherCartes();
}

// Pastilles : « Tous » + un statut chacune, avec le nombre de demandes
function afficherPastilles() {
  const zone = $("#pills");
  zone.replaceChildren();
  const choix = [["", "Tous", demandes.length]];
  for (const statut in LIBELLES) {
    choix.push([statut, LIBELLES[statut], demandes.filter(function (d) { return d.statut === statut; }).length]);
  }
  for (const [statut, libelle, nombre] of choix) {
    const pastille = creer("button", libelle + " ", "pill");
    pastille.type = "button";
    pastille.append(creer("span", "(" + nombre + ")", "counter"));
    pastille.setAttribute("aria-pressed", String(statutChoisi === statut));
    pastille.addEventListener("click", function () { statutChoisi = statut; afficher(); });
    zone.append(pastille);
  }
}

// Demandes qui correspondent au statut choisi et au texte recherché
function demandesFiltrees() {
  const texte = $("#f-patient").value.trim().toLowerCase();
  return demandes.filter(function (d) {
    if (statutChoisi && d.statut !== statutChoisi) return false;
    if (texte) {
      const identite = (d.patient_prenom + " " + d.patient_nom + " " + d.patient_telephone).toLowerCase();
      if (!identite.includes(texte)) return false;
    }
    return true;
  });
}

function afficherCartes() {
  const liste = $("#list");
  liste.replaceChildren();   // on vide la liste
  const lignes = demandesFiltrees();

  if (lignes.length === 0) {
    liste.append(creer("p", "Aucune demande pour ces critères.", "empty"));
    return;
  }

  for (const demande of lignes) {
    const carte = creer("div", undefined, "card");
    carte.append(
      creer("span", LIBELLES[demande.statut] || demande.statut, "tag " + demande.statut),
      creer("strong", formatDate(demande.date) + " · " + demande.heure_debut + " – " + demande.heure_fin),
      creer("span", demande.patient_prenom + " " + demande.patient_nom),
      creer("span", demande.patient_telephone, "tel"),
      creer("span", demande.medecin + " · " + demande.service)
    );
    if (demande.motif_demande) carte.append(creer("span", "Motif demandé : " + demande.motif_demande));
    if (demande.motif_decision) {
      carte.append(creer("span", "Motif de la décision : " + (MOTIFS[demande.motif_decision] || demande.motif_decision)));
    }
    const boutons = creerBoutonsAction(demande);
    if (boutons) carte.append(boutons);
    liste.append(carte);
  }
}

// Boutons selon le statut :  en attente -> Confirmer / Refuser ;  confirmé -> Annuler
function creerBoutonsAction(demande) {
  if (demande.statut === "en_attente") {
    const boutonConfirmer = creer("button", "Confirmer", "btn small ok");
    boutonConfirmer.type = "button";
    boutonConfirmer.addEventListener("click", function () { ouvrirBoite(demande, "confirmer"); });
    const boutonRefuser = creer("button", "Refuser", "btn small alt");
    boutonRefuser.type = "button";
    boutonRefuser.addEventListener("click", function () { ouvrirBoite(demande, "refuser"); });
    const ligne = creer("div", undefined, "row");
    ligne.append(boutonConfirmer, boutonRefuser);
    return ligne;
  }
  if (demande.statut === "confirme") {
    const boutonAnnuler = creer("button", "Annuler le rendez-vous", "btn small alt");
    boutonAnnuler.type = "button";
    boutonAnnuler.addEventListener("click", function () { ouvrirBoite(demande, "annuler"); });
    const ligne = creer("div", undefined, "row");
    ligne.append(boutonAnnuler);
    return ligne;
  }
  return null;
}


// ----- 3. Fenêtre de décision -----
// Confirmer : simple confirmation.  Refuser / annuler : motif obligatoire.
const TEXTES_BOITE = {
  confirmer: { titre: "Confirmer ce rendez-vous", motif: false, bouton: "Confirmer", note: "Un SMS de confirmation sera envoyé au patient." },
  refuser: { titre: "Refuser cette demande", motif: true, bouton: "Refuser", note: "Le patient sera prévenu par SMS." },
  annuler: { titre: "Annuler ce rendez-vous", motif: true, bouton: "Annuler le rendez-vous", note: "Le patient sera prévenu par SMS." }
};

function ouvrirBoite(demande, type) {
  const texte = TEXTES_BOITE[type];
  decisionEnCours = { id: demande.id, type: type };

  $("#boite-titre").textContent = texte.titre;
  $("#boite-resume").textContent = demande.patient_prenom + " " + demande.patient_nom + " · " +
    formatDate(demande.date) + " à " + demande.heure_debut + " · " + demande.medecin + ". " + texte.note;
  $("#boite-zone-motif").hidden = !texte.motif;
  $("#boite-motif").value = "";
  $("#boite-erreur").textContent = "";
  $("#boite-valider").textContent = texte.bouton;
  $("#boite-valider").className = type === "confirmer" ? "btn small ok" : "btn small alt";
  $("#boite-valider").disabled = false;
  $("#boite").showModal();
}

$("#boite-retour").addEventListener("click", function () { $("#boite").close(); });

$("#boite-valider").addEventListener("click", async function () {
  const { id, type } = decisionEnCours;
  const motif = $("#boite-motif").value;

  if (TEXTES_BOITE[type].motif && motif === "") {
    $("#boite-erreur").textContent = "Veuillez choisir un motif.";
    return;
  }

  $("#boite-valider").disabled = true;   // évite un double clic
  try {
    if (type === "confirmer") {
      await apiFetch("/appointments/" + id + "/status", { method: "PATCH", body: JSON.stringify({ statut: "confirme" }) });
      msg("Rendez-vous confirmé. Le patient sera prévenu par SMS.");
    } else if (type === "refuser") {
      await apiFetch("/appointments/" + id + "/status", { method: "PATCH", body: JSON.stringify({ statut: "refuse", motif_decision: motif }) });
      msg("Demande refusée. Le patient sera prévenu par SMS.");
    } else {
      await apiFetch("/appointments/" + id + "/cancel", { method: "POST", body: JSON.stringify({ motif_decision: motif }) });
      msg("Rendez-vous annulé. Le patient sera prévenu par SMS.");
    }
  } catch (erreur) {
    // Le serveur vérifie les règles (demande déjà traitée, créneau déjà confirmé...)
    msg(erreur.message, "err");
  }
  $("#boite").close();
  window.scrollTo(0, 0);
  chargerDemandes();   // on recharge toujours : après une erreur 409 la situation a changé
});


// ----- 4. Filtres -----
$("#f-date").addEventListener("change", chargerDemandes);   // filtres envoyés au serveur
$("#f-med").addEventListener("change", chargerDemandes);
$("#f-patient").addEventListener("input", afficherCartes);  // filtre appliqué ici

$("#f-raz").addEventListener("click", function () {
  $("#f-date").value = "";
  $("#f-med").value = "";
  $("#f-patient").value = "";
  statutChoisi = "";
  chargerDemandes();
});


// ----- 5. Démarrage de la page -----
async function demarrer() {
  // Liste déroulante des motifs
  const choisir = creer("option", "Choisir un motif…");
  choisir.value = "";
  $("#boite-motif").append(choisir);
  for (const code in MOTIFS) {
    const option = creer("option", MOTIFS[code]);
    option.value = code;
    $("#boite-motif").append(option);
  }

  // Liste déroulante des médecins pour le filtre
  try {
    const medecins = await apiFetch("/doctors");
    for (const medecin of medecins) {
      const option = creer("option", medecin.nom + (medecin.statut === "actif" ? "" : " (inactif)"));
      option.value = medecin.id;
      $("#f-med").append(option);
    }
  } catch (erreur) {
    msg(erreur.message, "err");
  }
  chargerDemandes();
}
demarrer();
