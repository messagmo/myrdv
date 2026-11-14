// Erreur avec un code HTTP et un message compréhensible pour l'utilisateur
class ErreurMetier extends Error {
  constructor(statut, message) {
    super(message);
    this.statut = statut;
  }
}

module.exports = ErreurMetier;
