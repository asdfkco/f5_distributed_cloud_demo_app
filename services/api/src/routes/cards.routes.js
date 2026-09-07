// Common: GET /api/v1/cards, POST /api/v1/cards/{cardId}/block
// Code-only: DELETE /api/v1/cards/{cardId}
const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { cards } = require('../data/seed');

const router = express.Router();

router.get('/', requireAuth, (req, res) => {
  const list = cards
    .filter((c) => c.userId === req.user.id)
    .map((c) => ({ id: c.id, maskedPan: c.maskedPan, brand: c.brand, status: c.status, expiry: c.expiry }));
  return res.json({ cards: list });
});

router.post('/:cardId/block', requireAuth, (req, res) => {
  const card = cards.find((c) => c.id === req.params.cardId && c.userId === req.user.id);
  if (!card) return res.status(404).json({ error: 'not_found' });
  card.status = 'BLOCKED';
  return res.json({ card: { id: card.id, status: card.status } });
});

// CODE-ONLY (see docs/ENDPOINT-MATRIX.md section B):
// Card cancellation is normally a call-center-only operation, not exposed in
// the customer-facing app. The route is defined and fully reachable, but the
// traffic-generator intentionally never calls it -- this is one of the six
// "code, no traffic" endpoints for the demo.
router.delete('/:cardId', requireAuth, (req, res) => {
  const idx = cards.findIndex((c) => c.id === req.params.cardId && c.userId === req.user.id);
  if (idx === -1) return res.status(404).json({ error: 'not_found' });
  cards.splice(idx, 1);
  return res.status(204).send();
});

module.exports = router;
