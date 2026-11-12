const jwt = require('jsonwebtoken');
const ErreurMetier = require('../business/ErreurMetier');

// Vérifie le jeton envoyé dans l'en-tête Authorization: Bearer <jeton>
function verifierToken(req, res, next) {
  const entete = req.headers.authorization || '';
  const [type, jeton] = entete.split(' ');
  if (type !== 'Bearer' || !jeton) {
    return next(new ErreurMetier(401, 'Connexion requise.'));
  }
  try {
    req.utilisateur = jwt.verify(jeton, process.env.JWT_SECRET); // { id, role }
    next();
  } catch (e) {
    next(new ErreurMetier(401, 'Session expirée ou invalide. Veuillez vous reconnecter.'));
  }
}

// Contrôle des rôles : patient, administrateur, agent_accueil
function exigerRole(...roles) {
  return (req, res, next) => {
    if (!req.utilisateur || !roles.includes(req.utilisateur.role)) {
      return next(new ErreurMetier(403, 'Accès non autorisé.'));
    }
    next();
  };
}

module.exports = { verifierToken, exigerRole };
