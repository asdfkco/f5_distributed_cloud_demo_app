// Code-only (see docs/ENDPOINT-MATRIX.md section B):
// GET  /api/v1/beneficiaries
// GET  /api/v1/statements/{year}/{month}
// POST /api/v1/loans/apply
//
// Mounted at the app root since these live under /api/v1 but are handled
// separately from the "live" v1 route files above. traffic-generator
// intentionally never calls any of these three.
const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { accounts } = require('../data/seed');

const router = express.Router();

const FEATURE_LOANS_ENABLED = String(process.env.FEATURE_LOANS_ENABLED || 'false').toLowerCase() === 'true';

// CODE-ONLY: superseded by a new beneficiaries UI flow; no client links here
// anymore, but the route stays registered.
router.get('/api/v1/beneficiaries', requireAuth, (req, res) => res.json({ beneficiaries: [] }));

// CODE-ONLY: statements feature not yet released to customers.
router.get('/api/v1/statements/:year/:month', requireAuth, (req, res) => {
  const account = accounts.find((a) => a.userId === req.user.id);
  return res.json({
    year: req.params.year,
    month: req.params.month,
    accountId: account ? account.id : null,
    lines: [],
    _unreleased: true,
  });
});

// CODE-ONLY: loans feature is behind FEATURE_LOANS_ENABLED and returns 503
// while disabled, but the route MUST stay registered so the code scanner
// picks it up.
router.post('/api/v1/loans/apply', requireAuth, (req, res) => {
  if (!FEATURE_LOANS_ENABLED) {
    return res.status(503).json({ error: 'feature_disabled', message: 'Loan applications are not yet available.' });
  }
  return res.status(201).json({ status: 'submitted' });
});

module.exports = router;
