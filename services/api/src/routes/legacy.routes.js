// Code-only (see docs/ENDPOINT-MATRIX.md section B):
// GET  /api/v0/legacy/accounts/{id}
// POST /api/v0/legacy/wire-transfer
//
// These routes are defined with full paths here (mounted at the app root)
// because they believed to have been retired ~2 years ago -- but the route
// handlers were never removed. The traffic-generator intentionally never
// calls these.
const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { accounts } = require('../data/seed');

const router = express.Router();

router.get('/api/v0/legacy/accounts/:id', requireAuth, (req, res) => {
  const account = accounts.find((a) => a.id === req.params.id && a.userId === req.user.id);
  if (!account) return res.status(404).json({ error: 'not_found' });
  return res.json({
    acct_id: account.id,
    acct_no: account.accountNumber,
    bal: account.balance,
    ccy: account.currency,
    _deprecated: true,
  });
});

router.post('/api/v0/legacy/wire-transfer', requireAuth, (req, res) => res.status(200).json({
  status: 'queued',
  _deprecated: true,
  message: 'This legacy wire endpoint is deprecated; use /api/v1/transfers instead.',
}));

module.exports = router;
