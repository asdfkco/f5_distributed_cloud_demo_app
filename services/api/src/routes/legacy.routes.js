// Code-only (docs/ENDPOINT-MATRIX.md B 섹션 참고):
// GET  /api/v0/legacy/accounts/{id}
// POST /api/v0/legacy/wire-transfer
//
// 이 라우트들은 여기에서 전체 경로로(app root에 마운트되어) 정의되어
// 있다. 약 2년 전에 폐기(retire)되었다고 알려져 있었지만, 라우트 핸들러는
// 실제로는 한 번도 제거된 적이 없기 때문이다. traffic-generator는
// 의도적으로 이 엔드포인트들을 절대 호출하지 않는다.
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
