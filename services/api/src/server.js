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

// - 정적 라우트: F5 XC Code Base Integration 스캐너가 소스코드에서
// 찾아내야 할 대상이다 (Common + Code-only). -
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/accounts', accountsRoutes);
app.use('/api/v1/transfers', transfersRoutes);
app.use('/api/v1/cards', cardsRoutes);
app.use(legacyRoutes);
app.use(unreleasedRoutes);

// Shadow 라우트는 정적 라우트 뒤, 404 핸들러 앞에 마운트한다.
// 런타임 파일이 없으면 조용히 건너뛴다.
loadDynamicRoutes(app);

app.use((req, res) => {
  res.status(404).json({ error: 'not_found', path: req.originalUrl });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`banking-api listening on :${PORT}`);
});

module.exports = app;
