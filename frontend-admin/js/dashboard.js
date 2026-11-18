// ============================================================
// dashboard.js : page « Demandes de rendez-vous »
// Le personnel voit toutes les demandes et peut :
//   - confirmer ou refuser une demande « en attente »
//   - annuler un rendez-vous « confirmé »
// Les SMS au patient sont envoyés automatiquement par le backend :
// cette page n'a rien à faire pour cela.
// ============================================================

garde();              // sécurité : réservé au personnel
entete("dashboard");  // barre du haut

const $ = function (selecteur) { return document.querySelector(selecteur); };

// Demandes reçues du serveur (filtrées par date et médecin) ; le statut et
// la recherche de patient sont appliqués ensuite, sans rappeler le serveur.
let demandes = [];

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
    msg(erreur.message, "err");
  }
}


// ----- 2. Afficher compteurs + tableau -----
function afficher() {
  afficherCompteurs();
  afficherTableau();
}

// Quatre compteurs ; cliquer sur l'un d'eux filtre le tableau sur ce statut
function afficherCompteurs() {
  const zone = $("#compteurs");
  zone.replaceChildren();
  for (const statut in LIBELLES) {
    const nombre = demandes.filter(function (d) { return d.statut === statut; }).length;
    const bouton = creer("button", undefined, "compteur");
    bouton.type = "button";
    bouton.setAttribute("aria-pressed", String($("#f-statut").value === statut));
    bouton.append(creer("strong", String(nombre)), creer("span", LIBELLES[statut]));
    bouton.addEventListener("click", function () {
      $("#f-statut").value = $("#f-statut").value === statut ? "" : statut;
      afficher();
    });
    zone.append(bouton);
  }
}

// Demandes qui correspondent au statut choisi et au texte recherché
function demandesFiltrees() {
  const statut = $("#f-statut").value;
  const texte = $("#f-patient").value.trim().toLowerCase();
  return demandes.filter(function (d) {
    if (statut && d.statut !== statut) return false;
    if (texte) {
      const identite = (d.patient_prenom + " " + d.patient_nom + " " + d.patient_telephone).toLowerCase();
      if (!identite.includes(texte)) return false;
    }
    return true;
  });
}

function afficherTableau() {
  const corps = $("#corps");
  corps.replaceChildren();   // on vide le tableau
  const lignes = demandesFiltrees();

  if (lignes.length === 0) {
    const ligneVide = creer("tr");
    const celluleVide = creer("td", "Aucune demande pour ces critères.", "vide");
    celluleVide.colSpan = 8;
    ligneVide.append(celluleVide);
    corps.append(ligneVide);
    return;
  }

  for (const demande of lignes) {
    const ligne = creer("tr");

    // Patient : nom + téléphone (petite ligne grise)
    const cellulePatient = cellule(undefined, "Patient");
    const identite = creer("div", demande.patient_prenom + " " + demande.patient_nom);
    identite.append(creer("div", demande.patient_telephone, "note"));
    cellulePatient.append(identite);
    ligne.append(cellulePatient);

    ligne.append(cellule(demande.service, "Service"));
    ligne.append(cellule(demande.medecin, "Médecin"));
    ligne.append(cellule(formatDate(demande.date), "Date"));
    ligne.append(cellule(demande.heure_debut + " – " + demande.heure_fin, "Heure"));
    ligne.append(cellule(demande.motif_demande || "—", "Motif demandé"));

    // Statut : badge coloré + motif de la décision s'il y en a un
    const celluleStatut = cellule(undefined, "Statut");
    const bloc = creer("div");
    bloc.append(creer("span", LIBELLES[demande.statut] || demande.statut, "badge " + demande.statut));
    if (demande.motif_decision) {
      bloc.append(creer("div", "Motif : " + (MOTIFS[demande.motif_decision] || demande.motif_decision), "note"));
    }
    celluleStatut.append(bloc);
    ligne.append(celluleStatut);

    const celluleActions = cellule(undefined, "Actions");
    celluleActions.append(creerBoutonsAction(demande));
    ligne.append(celluleActions);

    corps.append(ligne);
  }
}

// Boutons selon le statut :  en attente -> Confirmer / Refuser ;  confirmé -> Annuler
function creerBoutonsAction(demande) {
  const boite = creer("div", undefined, "actions");

  if (demande.statut === "en_attente") {
    const boutonConfirmer = creer("button", "Confirmer", "btn ok petit");
    boutonConfirmer.addEventListener("click", function () { ouvrirBoite(demande, "confirmer"); });
    const boutonRefuser = creer("button", "Refuser", "btn non petit");
    boutonRefuser.addEventListener("click", function () { ouvrirBoite(demande, "refuser"); });
    boite.append(boutonConfirmer, boutonRefuser);
  } else if (demande.statut === "confirme") {
    const boutonAnnuler = creer("button", "Annuler", "btn non petit");
    boutonAnnuler.addEventListener("click", function () { ouvrirBoite(demande, "annuler"); });
    boite.append(boutonAnnuler);
  } else {
    boite.append(creer("span", "—", "note"));
  }
  return boite;
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
  $("#boite-valider").className = type === "confirmer" ? "btn ok" : "btn non";
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
  chargerDemandes();   // on recharge toujours : après une erreur 409 la situation a changé
});


// ----- 4. Filtres -----
$("#f-date").addEventListener("change", chargerDemandes);   // filtres envoyés au serveur
$("#f-med").addEventListener("change", chargerDemandes);
$("#f-statut").addEventListener("change", afficher);        // filtres appliqués ici
$("#f-patient").addEventListener("input", afficherTableau);

$("#f-raz").addEventListener("click", function () {
  $("#f-date").value = "";
  $("#f-med").value = "";
  $("#f-statut").value = "";
  $("#f-patient").value = "";
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
