const express = require('express');
const { verifierToken, exigerRole } = require('../middleware/auth');
const ErreurMetier = require('../business/ErreurMetier');
const fournisseur = require('../sms/fournisseur');
const notificationData = require('../data/notification');

const router = express.Router();
const PERSONNEL = ['administrateur', 'agent_accueil'];

// POST /api/notifications/test : tester l'envoi d'un SMS (personnel, développement)
router.post('/test', verifierToken, exigerRole(...PERSONNEL), async (req, res, next) => {
  try {
    const { telephone, message } = req.body || {};
    if (!/^\+?[0-9]{8,15}$/.test(String(telephone || '').trim())) {
      throw new ErreurMetier(400, 'Numéro de téléphone invalide.');
    }
    const texte = message === undefined ? 'MyRDV : test de notification.' : message;
    if (typeof texte !== 'string' || texte.trim().length === 0 || texte.length > 160) {
      throw new ErreurMetier(400, 'Le message est obligatoire (160 caractères maximum).');
    }

    const mode = process.env.SMS_MODE || 'simulation';
    try {
      const resultat = await fournisseur.envoyer(telephone.trim(), texte.trim());
      res.json({ mode, statut_envoi: resultat.statut, reference_fournisseur: resultat.reference });
    } catch (err) {
      // Pour un test, on montre l'erreur technique au personnel
      res.json({ mode, statut_envoi: 'echec', reference_fournisseur: null, erreur: err.message });
    }
  } catch (err) {
    next(err);
  }
});

// GET /api/notifications?rendez_vous_id=1 : journal des envois (personnel)
router.get('/', verifierToken, exigerRole(...PERSONNEL), async (req, res, next) => {
  try {
    const brut = req.query.rendez_vous_id;
    if (brut !== undefined && brut !== '' && !/^[0-9]+$/.test(String(brut))) {
      throw new ErreurMetier(400, 'Paramètre « rendez_vous_id » invalide.');
    }
    const rendezVousId = brut === undefined || brut === '' ? null : parseInt(brut, 10);
    res.json(await notificationData.lister({ rendezVousId }));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
