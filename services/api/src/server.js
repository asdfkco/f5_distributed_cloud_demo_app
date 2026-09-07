require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { requestLogger } = require('./middleware/logging');
const { loadDynamicRoutes } = require('./dynamic/loader');

const authRoutes = require('./routes/auth.routes');
const usersRoutes = require('./routes/users.routes');
const accountsRoutes = require('./routes/accounts.routes');
const transfersRoutes = require('./routes/transfers.routes');
const cardsRoutes = require('./routes/cards.routes');
const legacyRoutes = require('./routes/legacy.routes');
const unreleasedRoutes = require('./routes/unreleased.routes');

const app = express();
app.use(cors());
app.use(express.json());
app.use(requestLogger);

app.get('/healthz', (req, res) => res.json({ status: 'ok', service: 'banking-api', time: new Date().toISOString() }));

// --- Static routes: these are what the F5 XC Code Base Integration scanner
// should find in source (Common + Code-only). ---
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/accounts', accountsRoutes);
app.use('/api/v1/transfers', transfersRoutes);
app.use('/api/v1/cards', cardsRoutes);
app.use(legacyRoutes);
app.use(unreleasedRoutes);

// --- Dynamic (Shadow) routes: mounted AFTER static routes, BEFORE the 404
// handler. Skips gracefully when the runtime file is absent. ---
loadDynamicRoutes(app);

app.use((req, res) => {
  res.status(404).json({ error: 'not_found', path: req.originalUrl });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`banking-api listening on :${PORT}`);
});

module.exports = app;
