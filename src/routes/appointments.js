const express = require('express');
const { verifierToken, exigerRole } = require('../middleware/auth');
const rendezVous = require('../business/rendezVous');

const router = express.Router();

// POST /api/appointments : créer une demande (patient)
router.post('/', verifierToken, exigerRole('patient'), async (req, res, next) => {
  try {
    const rdv = await rendezVous.creerDemande(req.utilisateur.id, req.body || {});
    res.status(201).json(rdv);
  } catch (err) {
    next(err);
  }
});

// GET /api/appointments/me : rendez-vous du patient connecté
router.get('/me', verifierToken, exigerRole('patient'), async (req, res, next) => {
  try {
    res.json(await rendezVous.listerMesRendezVous(req.utilisateur.id));
  } catch (err) {
    next(err);
  }
});

// PATCH /api/appointments/:id/status : confirmer ou refuser (personnel autorisé)
router.patch(
  '/:id/status',
  verifierToken,
  exigerRole('administrateur', 'agent_accueil'),
  async (req, res, next) => {
    try {
      res.json(await rendezVous.decider(req.params.id, req.body || {}));
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/appointments/:id/cancel : patient propriétaire ou personnel
router.post(
  '/:id/cancel',
  verifierToken,
  exigerRole('patient', 'administrateur', 'agent_accueil'),
  async (req, res, next) => {
    try {
      res.json(await rendezVous.annuler(req.utilisateur, req.params.id, req.body || {}));
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
