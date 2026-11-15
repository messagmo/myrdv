const form = document.getElementById('form'), err = document.getElementById('error'), btn = document.getElementById('submit');
form.addEventListener('submit', async e => {
  e.preventDefault(); err.textContent = '';
  const prenom = form.prenom.value.trim(), nom = form.nom.value.trim(), email = form.email.value.trim();
  const telephone = Auth.normalizePhone(form.tel.value), password = form.pw.value;
  if (!prenom) return err.textContent = 'Entrez votre prénom.';
  if (!nom) return err.textContent = 'Entrez votre nom.';
  if (!telephone) return err.textContent = 'Entrez un numéro camerounais valide, par exemple 6XX XX XX XX.';
  if (email && !/^\S+@\S+\.\S+$/.test(email)) return err.textContent = 'L\'adresse e-mail n\'est pas valide.';
  if (password.length < 8) return err.textContent = 'Le mot de passe doit contenir au moins 8 caractères.';
  if (password !== form.pw2.value) return err.textContent = 'Les deux mots de passe ne sont pas identiques.';
  btn.disabled = true; btn.textContent = 'Création du compte…';
  try { Auth.save(await Api.register({ nom, prenom, telephone, email: email || undefined, password })); location.href = 'services.html'; }
  catch (x) { err.textContent = x.message; btn.disabled = false; btn.textContent = 'Créer mon compte'; }
});
