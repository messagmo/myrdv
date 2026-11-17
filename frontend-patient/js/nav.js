// Bouton « Se déconnecter » : présent sur toutes les pages après connexion
document.querySelectorAll('[data-logout]').forEach(b => b.addEventListener('click', () => Auth.logout()));
