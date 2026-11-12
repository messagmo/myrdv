const ErreurMetier = require('./ErreurMetier');
const serviceData = require('../data/service');
const medecinData = require('../data/medecin');
const creneauData = require('../data/creneau');

// Le patient ne voit que ce qui est actif et réservable ; le personnel voit tout.
const estPatient = (role) => role === 'patient';

function entierOuNull(valeur, nomChamp) {
  if (valeur === undefined || valeur === '') return null;
  if (!/^[0-9]+$/.test(String(valeur))) {
    throw new ErreurMetier(400, `Paramètre « ${nomChamp} » invalide.`);
  }
  return parseInt(valeur, 10);
}

function dateOuNull(valeur) {
  if (valeur === undefined || valeur === '') return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(valeur))) {
    throw new ErreurMetier(400, 'Date invalide (format attendu : AAAA-MM-JJ).');
  }
  return valeur;
}

async function listerServices(role) {
  return serviceData.lister({ seulementActifs: estPatient(role) });
}

async function listerMedecins(role, { service_id }) {
  return medecinData.lister({
    seulementActifs: estPatient(role),
    serviceId: entierOuNull(service_id, 'service_id'),
  });
}

async function listerCreneaux(role, { medecin_id, date }) {
  return creneauData.lister({
    seulementDisponibles: estPatient(role),
    medecinId: entierOuNull(medecin_id, 'medecin_id'),
    date: dateOuNull(date),
  });
}

module.exports = { listerServices, listerMedecins, listerCreneaux };
