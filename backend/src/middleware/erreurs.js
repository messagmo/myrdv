const ErreurMetier = require('../business/ErreurMetier');

function introuvable(req, res) {
  res.status(404).json({ message: 'Route introuvable.' });
}

function gestionErreurs(err, req, res, next) {
  if (err instanceof ErreurMetier) {
    return res.status(err.statut).json({ message: err.message });
  }
  console.error(err);
  res.status(500).json({ message: 'Une erreur est survenue. Veuillez réessayer.' });
}

module.exports = { introuvable, gestionErreurs };
