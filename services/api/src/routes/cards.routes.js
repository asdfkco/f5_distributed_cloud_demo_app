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

// CODE-ONLY (docs/ENDPOINT-MATRIX.md B 섹션 참고):
// 카드 해지(취소)는 일반적으로 콜센터 전용 업무이며, 고객용 앱에는
// 노출되지 않는다. 이 라우트는 정의되어 있고 완전히 도달 가능하지만,
// traffic-generator는 의도적으로 이 엔드포인트를 절대 호출하지 않는다 
// 이는 데모에서 사용하는 "코드는 있지만 트래픽은 없는" 6개 엔드포인트 중
// 하나이다.
router.delete('/:cardId', requireAuth, (req, res) => {
  const idx = cards.findIndex((c) => c.id === req.params.cardId && c.userId === req.user.id);
  if (idx === -1) return res.status(404).json({ error: 'not_found' });
  cards.splice(idx, 1);
  return res.status(204).send();
});

module.exports = router;
