// Texte des SMS. Aucune information médicale sensible (section 5.3 du cahier des charges).

const LIBELLES_MOTIFS = {
  medecin_indisponible: 'médecin indisponible',
  demande_incomplete: 'demande incomplète',
  autre: 'autre motif',
};

// 2026-11-20 -> 20/11/2026
function dateFrancaise(iso) {
  const [annee, mois, jour] = iso.split('-');
  return `${jour}/${mois}/${annee}`;
}

function construireMessage(type, { date, heure_debut, motif_decision }) {
  const etablissement = process.env.NOM_ETABLISSEMENT || "l'établissement";
  const motif = LIBELLES_MOTIFS[motif_decision] || 'autre motif';

  switch (type) {
    case 'confirmation':
      return `MyRDV : votre rendez-vous à ${etablissement} est confirmé le ${dateFrancaise(date)} à ${heure_debut}.`;
    case 'rappel':
      return `MyRDV : rappel de votre rendez-vous prévu demain à ${heure_debut}.`;
    case 'refus':
      return `MyRDV : votre demande de rendez-vous du ${dateFrancaise(date)} a été refusée. Motif : ${motif}.`;
    case 'annulation':
      return `MyRDV : votre rendez-vous du ${dateFrancaise(date)} à ${heure_debut} a été annulé. Motif : ${motif}.`;
    default:
      throw new Error(`Type de notification inconnu : ${type}`);
  }
}

module.exports = { construireMessage };
