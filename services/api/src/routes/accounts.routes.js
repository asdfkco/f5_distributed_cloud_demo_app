// Common: GET /api/v1/accounts, GET /api/v1/accounts/{accountId},
//         GET /api/v1/accounts/{accountId}/transactions
const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { accounts, transactions } = require('../data/seed');

const router = express.Router();

router.get('/', requireAuth, (req, res) => {
  const list = accounts.filter((a) => a.userId === req.user.id);
  return res.json({ accounts: list });
});

// SECURITY DEMO NOTE -- INTENTIONAL, DO NOT "FIX":
// This endpoint deliberately does NOT verify that req.user owns `accountId`.
// Any authenticated user's token can fetch ANY account by id. This is a
// deliberate BOLA/IDOR finding for the F5 XC API security demo (paired with
// a cross-user probe in the traffic-generator). Adding an ownership check
// here would remove the vulnerability the demo is built to showcase.
router.get('/:accountId', requireAuth, (req, res) => {
  const account = accounts.find((a) => a.id === req.params.accountId);
  if (!account) return res.status(404).json({ error: 'not_found' });
  return res.json({ account });
});

router.get('/:accountId/transactions', requireAuth, (req, res) => {
  const account = accounts.find((a) => a.id === req.params.accountId && a.userId === req.user.id);
  if (!account) return res.status(404).json({ error: 'not_found' });
  const list = transactions.filter((t) => t.accountId === account.id);
  return res.json({ transactions: list });
});

module.exports = router;
