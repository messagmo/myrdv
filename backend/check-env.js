require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const cle = process.env.AT_API_KEY || '';
console.log('Cle presente :', cle.length > 0, '| longueur :', cle.length);
console.log('Utilisateur :', process.env.AT_USERNAME);
console.log('Mode SMS :', process.env.SMS_MODE);
