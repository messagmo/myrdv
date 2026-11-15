// ============================================================
// dashboard.js : page « Demandes de rendez-vous »
// Elle affiche les demandes, permet de filtrer, de confirmer,
// de refuser (avec motif) et d'annuler (avec motif).
// Les SMS au patient sont envoyés automatiquement par le backend :
// cette page n'a rien à faire pour cela.
// ============================================================

garde();              // sécurité : réservé au personnel connecté
entete("dashboard");  // barre du haut

const $ = function (selecteur) { return document.querySelector(selecteur); };

// Texte affiché pour chaque statut
const LIBELLES = {
  en_attente: "En attente",
  confirme: "Confirmé",
  refuse: "Refusé",
  annule: "Annulé"
};

// Décision en cours d'enregistrement dans la fenêtre de motif
let decisionEnCours = null;


// ----- 1. Charger les demandes (avec les filtres choisis) -----
async function chargerDemandes() {
  const filtres = new URLSearchParams();
  if ($("#f-date").value) filtres.set("date", $("#f-date").value);
  if ($("#f-med").value) filtres.set("medecin_id", $("#f-med").value);
  if ($("#f-statut").value) filtres.set("statut", $("#f-statut").value);

  // Exemple de résultat : "/appointments?statut=en_attente&date=2026-11-20"
  let chemin = "/appointments";
  if (filtres.toString() !== "") chemin += "?" + filtres.toString();

  try {
    afficherDemandes(await apiFetch(chemin));
  } catch (erreur) {
    msg(erreur.message, "err");
  }
}


// ----- 2. Remplir le tableau -----
function afficherDemandes(demandes) {
  const corps = $("#corps");
  corps.replaceChildren();   // on vide le tableau

  if (demandes.length === 0) {
    const ligneVide = creer("tr");
    const cellule = creer("td", "Aucun résultat pour ces critères.", "vide");
    cellule.colSpan = 8;
    ligneVide.append(cellule);
    corps.append(ligneVide);
    return;
  }

  for (const demande of demandes) {
    const ligne = creer("tr");

    // Patient : nom + téléphone (petite ligne grise)
    const cellulePatient = creer("td", demande.patient_prenom + " " + demande.patient_nom);
    cellulePatient.append(creer("div", demande.patient_telephone, "note"));
    ligne.append(cellulePatient);

    ligne.append(creer("td", demande.service));
    ligne.append(creer("td", demande.medecin));
    ligne.append(creer("td", demande.date));
    ligne.append(creer("td", demande.heure_debut + " – " + demande.heure_fin));
    ligne.append(creer("td", demande.motif_demande || "—"));

    // Statut : badge coloré + motif de la décision s'il y en a un
    const celluleStatut = creer("td");
    celluleStatut.append(creer("span", LIBELLES[demande.statut] || demande.statut, "badge " + demande.statut));
    if (demande.motif_decision) {
      celluleStatut.append(creer("div", "Motif : " + (MOTIFS[demande.motif_decision] || demande.motif_decision), "note"));
    }
    ligne.append(celluleStatut);

    const celluleActions = creer("td");
    celluleActions.append(creerBoutonsAction(demande));
    ligne.append(celluleActions);

    corps.append(ligne);
  }
}

// Boutons selon le statut :
//   en attente -> Confirmer / Refuser      confirmé -> Annuler
function creerBoutonsAction(demande) {
  const boite = creer("div", undefined, "actions");

  if (demande.statut === "en_attente") {
    const boutonConfirmer = creer("button", "Confirmer", "btn ok petit");
    boutonConfirmer.addEventListener("click", function () { confirmerDemande(demande.id); });

    const boutonRefuser = creer("button", "Refuser", "btn non petit");
    boutonRefuser.addEventListener("click", function () { ouvrirBoiteMotif(demande.id, "refus"); });

    boite.append(boutonConfirmer, boutonRefuser);
  }

  if (demande.statut === "confirme") {
    const boutonAnnuler = creer("button", "Annuler", "btn non petit");
    boutonAnnuler.addEventListener("click", function () { ouvrirBoiteMotif(demande.id, "annulation"); });
    boite.append(boutonAnnuler);
  }
  return boite;
}


// ----- 3. Confirmer -----
function confirmerDemande(id) {
  if (!confirm("Confirmer ce rendez-vous ? Un SMS sera envoyé au patient.")) return;
  envoyer("/appointments/" + id + "/status", "PATCH", { statut: "confirme" },
          "Rendez-vous confirmé. Le patient sera prévenu par SMS.");
}


// ----- 4. Refuser ou annuler : fenêtre pour choisir le motif -----
function ouvrirBoiteMotif(id, type) {
  decisionEnCours = { id: id, type: type };
  $("#boite-titre").textContent = type === "refus" ? "Refuser cette demande" : "Annuler ce rendez-vous";
  $("#boite-motif").value = "";
  $("#boite-erreur").textContent = "";
  $("#boite").showModal();
}

$("#boite-annuler").addEventListener("click", function () { $("#boite").close(); });

$("#boite-valider").addEventListener("click", function () {
  const motif = $("#boite-motif").value;
  if (motif === "") {
    $("#boite-erreur").textContent = "Veuillez choisir un motif.";
    return;
  }
  $("#boite").close();

  const id = decisionEnCours.id;
  if (decisionEnCours.type === "refus") {
    envoyer("/appointments/" + id + "/status", "PATCH", { statut: "refuse", motif_decision: motif },
            "Demande refusée. Le patient sera prévenu par SMS.");
  } else {
    envoyer("/appointments/" + id + "/cancel", "POST", { motif_decision: motif },
            "Rendez-vous annulé. Le patient sera prévenu par SMS.");
  }
});

// Envoie la décision au serveur (c'est lui qui vérifie les règles :
// demande déjà traitée, créneau déjà pris, etc.)
// Après l'envoi, on recharge toujours la liste : après une erreur 409,
// la situation a changé et il faut afficher la liste à jour.
async function envoyer(chemin, methode, corps, messageSucces) {
  try {
    await apiFetch(chemin, { method: methode, body: JSON.stringify(corps) });
    msg(messageSucces);
  } catch (erreur) {
    msg(erreur.message, "err");
  }
  chargerDemandes();
}


// ----- 5. Boutons de filtre -----
$("#f-ok").addEventListener("click", chargerDemandes);

$("#f-raz").addEventListener("click", function () {
  $("#f-date").value = "";
  $("#f-med").value = "";
  $("#f-statut").value = "";
  chargerDemandes();
});


// ----- 6. Démarrage de la page -----
async function demarrer() {
  // Liste déroulante des motifs (fenêtre de refus / annulation)
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
      const option = creer("option", medecin.nom);
      option.value = medecin.id;
      $("#f-med").append(option);
    }
  } catch (erreur) {
    // pas grave : le filtre médecin restera sur « Tous »
  }
  chargerDemandes();
}
demarrer();
