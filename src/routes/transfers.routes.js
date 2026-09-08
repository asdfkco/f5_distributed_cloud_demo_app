// Common: POST /api/v1/transfers, GET /api/v1/transfers/{transferId}
const express = require('express');
const crypto = require('crypto');
const { requireAuth } = require('../middleware/auth');
const { accounts, transfers } = require('../data/seed');

const router = express.Router();

router.post('/', requireAuth, (req, res) => {
  const { fromAccountId, toAccountId, amount, currency, memo } = req.body || {};
  const from = accounts.find((a) => a.id === fromAccountId && a.userId === req.user.id);
  if (!from) return res.status(403).json({ error: 'forbidden', message: 'fromAccountId must belong to the authenticated user' });
  const to = accounts.find((a) => a.id === toAccountId);
  if (!to) return res.status(404).json({ error: 'not_found', message: 'toAccountId does not exist' });
  const amt = Number(amount);
  if (!amt || amt <= 0) return res.status(400).json({ error: 'invalid_amount' });
  if (from.balance < amt) return res.status(409).json({ error: 'insufficient_funds' });

  from.balance -= amt;
  to.balance += amt;

  const transfer = {
    id: `trf_${crypto.randomUUID()}`,
    fromAccountId: from.id,
    toAccountId: to.id,
    amount: amt,
    currency: currency || from.currency,
    memo: memo || '',
    status: 'COMPLETED',
    createdAt: new Date().toISOString(),
  };
  transfers.push(transfer);
  return res.status(201).json({ transfer });
});

router.get('/:transferId', requireAuth, (req, res) => {
  const transfer = transfers.find((t) => t.id === req.params.transferId);
  if (!transfer) return res.status(404).json({ error: 'not_found' });
  const owns = accounts.some(
    (a) => a.userId === req.user.id && (a.id === transfer.fromAccountId || a.id === transfer.toAccountId),
  );
  if (!owns) return res.status(403).json({ error: 'forbidden' });
  return res.json({ transfer });
});

module.exports = router;
