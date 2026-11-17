// ============================================================
// gestion.js : page « Gestion » (services, médecins, créneaux)
// Les trois onglets fonctionnent de la même façon : un formulaire
// pour ajouter/modifier + un tableau. Le code est écrit une seule
// fois ; la description de chaque onglet est dans l'objet ONGLETS.
// ============================================================

const utilisateurConnecte = garde();
// Le médecin n'a pas accès à cette page : retour à son tableau de bord
if (estMedecin(utilisateurConnecte)) location.href = "dashboard.html";
entete("gestion");

const $ = function (selecteur) { return document.querySelector(selecteur); };

// Date d'aujourd'hui au format AAAA-MM-JJ (un créneau ne peut pas être dans le passé)
const AUJOURDHUI = new Date().toLocaleDateString("sv-SE");

// ----- Description de chaque onglet -----
// champs   : zones du formulaire (cle = nom envoyé à l'API)
//            type "liste" = liste déroulante remplie avec donnees[liste]
//            fixe = true : champ non modifiable après la création
// colonnes : colonnes du tableau (cle = nom reçu de l'API)
// actif / inactif : les deux valeurs possibles du champ "statut"
const ONGLETS = {
  services: {
    titre: "Services",
    champs: [
      { cle: "nom", libelle: "Nom du service", type: "text", requis: true },
      { cle: "description_courte", libelle: "Description courte", type: "text", requis: false }
    ],
    colonnes: [
      { cle: "nom", libelle: "Nom" },
      { cle: "description_courte", libelle: "Description" }
    ],
    actif: "actif", inactif: "inactif",
    texteActif: "Actif", texteInactif: "Inactif",
    boutonDesactiver: "Désactiver", boutonActiver: "Activer"
  },
  doctors: {
    titre: "Médecins",
    champs: [
      { cle: "nom", libelle: "Nom du médecin", type: "text", requis: true },
      { cle: "service_id", libelle: "Service", type: "liste", liste: "services", requis: true }
    ],
    colonnes: [
      { cle: "nom", libelle: "Nom" },
      { cle: "service", libelle: "Service" }
    ],
    actif: "actif", inactif: "inactif",
    texteActif: "Actif", texteInactif: "Inactif",
    boutonDesactiver: "Désactiver", boutonActiver: "Activer"
  },
  slots: {
    titre: "Créneaux",
    champs: [
      { cle: "medecin_id", libelle: "Médecin", type: "liste", liste: "doctors", requis: true, fixe: true },
      { cle: "date", libelle: "Date", type: "date", requis: true },
      { cle: "heure_debut", libelle: "Heure de début", type: "time", requis: true },
      { cle: "heure_fin", libelle: "Heure de fin", type: "time", requis: true }
    ],
    colonnes: [
      { cle: "medecin", libelle: "Médecin" },
      { cle: "date", libelle: "Date" },
      { cle: "heure_debut", libelle: "Début" },
      { cle: "heure_fin", libelle: "Fin" }
    ],
    actif: "disponible", inactif: "indisponible",
    texteActif: "Disponible", texteInactif: "Indisponible",
    boutonDesactiver: "Rendre indisponible", boutonActiver: "Rendre disponible"
  }
};

// ----- État de la page -----
let ongletActuel = "services";   // onglet affiché
let elementEnEdition = null;     // élément en cours de modification (null = on ajoute)
const donnees = { services: [], doctors: [], slots: [] };   // ce qui vient de l'API


// ----- Créneaux : on ne garde que ceux qui ne sont pas terminés -----
function finDuCreneau(creneau) {
  return new Date(String(creneau.date).slice(0, 10) + "T" + String(creneau.heure_fin).slice(0, 5));
}
function creneauAVenir(creneau) {
  return finDuCreneau(creneau) > new Date();
}
function cleDeTri(creneau) {
  return String(creneau.date).slice(0, 10) + String(creneau.heure_debut).slice(0, 5);
}


// ----- 1. Charger les données depuis l'API -----
async function chargerTout() {
  try {
    donnees.services = await apiFetch("/services");
    donnees.doctors = await apiFetch("/doctors");
    // Les anciens créneaux (déjà terminés) ne s'affichent plus ; les autres sont triés par date
    const tousLesCreneaux = await apiFetch("/slots");
    donnees.slots = tousLesCreneaux.filter(creneauAVenir).sort(function (a, b) {
      return cleDeTri(a).localeCompare(cleDeTri(b));
    });
    dessinerPage();
  } catch (erreur) {
    msg(erreur.message, "err");
  }
}


// ----- 2. Dessiner la page -----
function dessinerPage() {
  dessinerOnglets();
  $("#titre").textContent = (elementEnEdition ? "Modifier : " : "Ajouter : ") + ONGLETS[ongletActuel].titre.toLowerCase();
  dessinerFormulaire();
  dessinerTableau();
}

function dessinerOnglets() {
  const zone = $("#onglets");
  zone.replaceChildren();

  for (const cle in ONGLETS) {
    const bouton = creer("button", ONGLETS[cle].titre, cle === ongletActuel ? "btn" : "btn sec");
    bouton.addEventListener("click", function () {
      ongletActuel = cle;
      elementEnEdition = null;
      dessinerPage();
    });
    zone.append(bouton);
  }
}

function dessinerFormulaire() {
  const formulaire = $("#form");
  formulaire.replaceChildren();

  for (const champ of ONGLETS[ongletActuel].champs) {
    const etiquette = creer("label", champ.libelle + (champ.requis ? "" : " (facultatif)"));
    etiquette.htmlFor = "c-" + champ.cle;

    let zoneSaisie;
    if (champ.type === "liste") {
      // Liste déroulante : on ne propose que les éléments actifs
      zoneSaisie = creer("select");
      const choisir = creer("option", "Choisir…");
      choisir.value = "";
      zoneSaisie.append(choisir);
      for (const x of donnees[champ.liste]) {
        if (x.statut !== "actif") continue;
        const option = creer("option", x.nom);
        option.value = x.id;
        zoneSaisie.append(option);
      }
    } else {
      zoneSaisie = creer("input");
      zoneSaisie.type = champ.type;
      if (champ.type === "date") zoneSaisie.min = AUJOURDHUI;
    }
    zoneSaisie.id = "c-" + champ.cle;
    zoneSaisie.required = champ.requis;

    // En modification, on pré-remplit ; un champ « fixe » est bloqué
    if (elementEnEdition) {
      zoneSaisie.value = elementEnEdition[champ.cle] ?? "";
      if (champ.fixe) zoneSaisie.disabled = true;
    }
    formulaire.append(etiquette, zoneSaisie);
  }

  const boutonValider = creer("button", elementEnEdition ? "Enregistrer" : "Ajouter", "btn");
  boutonValider.type = "submit";
  formulaire.append(boutonValider);

  if (elementEnEdition) {
    const boutonAnnuler = creer("button", "Annuler", "btn sec");
    boutonAnnuler.type = "button";
    boutonAnnuler.addEventListener("click", function () {
      elementEnEdition = null;
      dessinerPage();
    });
    formulaire.append(boutonAnnuler);
  }
}

function dessinerTableau() {
  const onglet = ONGLETS[ongletActuel];
  const lignes = donnees[ongletActuel];

  // En-tête du tableau
  const enteteLigne = creer("tr");
  for (const colonne of onglet.colonnes) enteteLigne.append(creer("th", colonne.libelle));
  enteteLigne.append(creer("th", "État"), creer("th", "Actions"));
  $("thead").replaceChildren(enteteLigne);

  // Corps du tableau
  const corps = $("tbody");
  corps.replaceChildren();

  if (lignes.length === 0) {
    const ligneVide = creer("tr");
    const cellule = creer("td", "Rien à afficher. Utilisez le formulaire pour ajouter un élément.", "vide");
    cellule.colSpan = 9;
    ligneVide.append(cellule);
    corps.append(ligneVide);
    return;
  }

  for (const element of lignes) {
    const ligne = creer("tr");

    for (const colonne of onglet.colonnes) {
      ligne.append(creer("td", String(element[colonne.cle] ?? "—")));
    }

    // État : badge vert si actif/disponible, gris sinon
    const estActif = element.statut === onglet.actif;
    const celluleEtat = creer("td");
    celluleEtat.append(creer("span", estActif ? onglet.texteActif : onglet.texteInactif, "badge " + (estActif ? "libre" : "annule")));
    ligne.append(celluleEtat);

    const celluleActions = creer("td");
    celluleActions.append(creerBoutons(element, estActif));
    ligne.append(celluleActions);

    corps.append(ligne);
  }
}

// Boutons Modifier + Activer/Désactiver (on ne supprime jamais)
function creerBoutons(element, estActif) {
  const onglet = ONGLETS[ongletActuel];
  const boite = creer("div", undefined, "actions");

  const boutonModifier = creer("button", "Modifier", "btn sec petit");
  boutonModifier.addEventListener("click", function () {
    elementEnEdition = element;
    dessinerPage();
    window.scrollTo(0, 0);
  });

  const boutonEtat = creer("button", estActif ? onglet.boutonDesactiver : onglet.boutonActiver, "btn sec petit");
  boutonEtat.addEventListener("click", function () { changerEtat(element, estActif); });

  boite.append(boutonModifier, boutonEtat);
  return boite;
}


// ----- 3. Enregistrer (ajout ou modification) -----
$("#form").addEventListener("submit", async function (evenement) {
  evenement.preventDefault();   // empêche le rechargement de la page
  const onglet = ONGLETS[ongletActuel];

  // On lit les champs du formulaire
  const saisie = {};
  for (const champ of onglet.champs) {
    const zone = $("#c-" + champ.cle);
    if (zone.disabled) continue;                 // champ bloqué : on ne l'envoie pas
    let valeur = zone.value.trim();
    if (valeur === "" && !champ.requis) continue;  // champ facultatif vide : on l'ignore
    if (champ.type === "liste") valeur = Number(valeur);   // l'API attend un nombre
    saisie[champ.cle] = valeur;
  }

  try {
    if (elementEnEdition) {
      // Modification : on n'envoie QUE les champs qui ont changé
      const modifications = {};
      for (const cle in saisie) {
        if (String(saisie[cle]) !== String(elementEnEdition[cle] ?? "")) modifications[cle] = saisie[cle];
      }
      if (Object.keys(modifications).length === 0) {
        msg("Aucune modification à enregistrer.", "err");
        return;
      }
      await apiFetch("/" + ongletActuel + "/" + elementEnEdition.id, { method: "PATCH", body: JSON.stringify(modifications) });
      msg("Modifications enregistrées.");
    } else {
      await apiFetch("/" + ongletActuel, { method: "POST", body: JSON.stringify(saisie) });
      msg("Élément ajouté.");
    }
    elementEnEdition = null;
  } catch (erreur) {
    msg(erreur.message, "err");   // ex. « Ce créneau a un rendez-vous confirmé : annulez-le d'abord. »
  }
  chargerTout();   // on recharge toujours : la situation a pu changer
});


// ----- 4. Activer / désactiver -----
async function changerEtat(element, estActif) {
  const onglet = ONGLETS[ongletActuel];
  const nouveauStatut = estActif ? onglet.inactif : onglet.actif;
  try {
    await apiFetch("/" + ongletActuel + "/" + element.id, { method: "PATCH", body: JSON.stringify({ statut: nouveauStatut }) });
    msg("État mis à jour.");
  } catch (erreur) {
    msg(erreur.message, "err");
  }
  chargerTout();
}


chargerTout();
