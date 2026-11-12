const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const servicesRoutes = require('./routes/services');
const doctorsRoutes = require('./routes/doctors');
const slotsRoutes = require('./routes/slots');
const appointmentsRoutes = require('./routes/appointments');
const { introuvable, gestionErreurs } = require('./middleware/erreurs');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ statut: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/doctors', doctorsRoutes);
app.use('/api/slots', slotsRoutes);
app.use('/api/appointments', appointmentsRoutes);

app.use(introuvable);
app.use(gestionErreurs);

module.exports = app;
