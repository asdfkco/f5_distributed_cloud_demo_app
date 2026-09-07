// Common: GET /api/v1/cards, POST /api/v1/cards/{cardId}/block,
//         POST /api/v1/cards/{cardId}/reissue
// Code-only: DELETE /api/v1/cards/{cardId}
const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { cards, maskPan } = require('../data/seed');

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

// 정지된 카드를 재발급한다. 새 번호를 부여하고 다시 사용 가능 상태로 되돌린다.
// 제너레이터가 blockCard만 계속 호출하면 몇 시간 뒤 모든 카드가 BLOCKED로
// 굳어 화면이 죽는다. 이 엔드포인트가 그 상태를 되돌린다.
router.post('/:cardId/reissue', requireAuth, (req, res) => {
  const card = cards.find((c) => c.id === req.params.cardId && c.userId === req.user.id);
  if (!card) return res.status(404).json({ error: 'not_found' });
  if (card.status !== 'BLOCKED') {
    return res.status(409).json({ error: 'not_blocked', message: '정지된 카드만 재발급할 수 있습니다.' });
  }

  // 뒤 4자리만 바꾼 새 번호를 발급한다. 앞자리는 브랜드 식별 구간이라 유지.
  const suffix = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  card.pan = card.pan.slice(0, -4) + suffix;
  card.maskedPan = maskPan(card.pan);
  card.status = 'ACTIVE';

  const [mm, yy] = card.expiry.split('/');
  card.expiry = `${mm}/${String(Number(yy) + 3).padStart(2, '0')}`;

  return res.json({
    card: { id: card.id, maskedPan: card.maskedPan, brand: card.brand, status: card.status, expiry: card.expiry },
  });
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
