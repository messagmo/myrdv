Auth.getToken() && (location.href = 'services.html');
const form = document.getElementById('form'), err = document.getElementById('error'), btn = document.getElementById('submit');
form.addEventListener('submit', async e => {
  e.preventDefault(); err.textContent = '';
  const telephone = Auth.normalizePhone(form.tel.value), password = form.pw.value;
  if (!telephone) return err.textContent = 'Entrez un numéro camerounais valide, par exemple 6XX XX XX XX.';
  if (!password) return err.textContent = 'Entrez votre mot de passe.';
  btn.disabled = true; btn.textContent = 'Connexion…';
  try { Auth.save(await Api.login({ telephone, password })); location.href = 'services.html'; }
  catch (x) { err.textContent = x.message; btn.disabled = false; btn.textContent = 'Se connecter'; }
});
