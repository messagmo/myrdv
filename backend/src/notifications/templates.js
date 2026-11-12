// Modèles de SMS MyRDV.
// Règle : aucune information médicale (pas de médecin, de service ni de symptôme).
// On évite les caractères spéciaux (apostrophe typographique, œ) pour rester en SMS standard.

const MOTIF_MAX = 60;

function formaterDate(dateIso) {
  // "2026-11-20" -> "20/11/2026"
  const [annee, mois, jour] = String(dateIso).split('-');
  return `${jour}/${mois}/${annee}`;
}

function formaterHeure(heure) {
  // "09:30:00" -> "09:30"
  return String(heure).slice(0, 5);
}

function nettoyerMotif(motif) {
  const texte = String(motif || '').replace(/\s+/g, ' ').trim();
  if (!texte) return 'non précisé';
  return texte.slice(0, MOTIF_MAX);
}

const MODELES = {
  confirmation: ({ date, heure }) =>
    `MyRDV : votre rendez-vous du ${formaterDate(date)} à ${formaterHeure(heure)} est confirmé.`,

  refus: ({ date, motif }) =>
    `MyRDV : votre demande de rendez-vous du ${formaterDate(date)} a été refusée. Motif : ${nettoyerMotif(motif)}.`,

  annulation: ({ date, motif }) =>
    `MyRDV : votre rendez-vous du ${formaterDate(date)} a été annulé. Motif : ${nettoyerMotif(motif)}.`,

  rappel: ({ heure }) =>
    `MyRDV : rappel, vous avez un rendez-vous demain à ${formaterHeure(heure)}.`,
};

function genererMessage(type, donnees) {
  const modele = MODELES[type];
  if (!modele) {
    throw new Error(`Type de notification inconnu : ${type}`);
  }
  return modele(donnees);
}

module.exports = { genererMessage, MODELES, MOTIF_MAX };
