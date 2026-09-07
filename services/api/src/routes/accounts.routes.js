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

// 보안 데모 참고사항, 의도된 것이므로 "고치지" 말 것:
// 이 엔드포인트는 의도적으로 req.user가 `accountId`의 소유자인지 검증하지
// 않는다. 인증된 사용자라면 누구의 토큰으로든 어떤 계좌든 id로 조회할 수
// 있다. 이는 F5 XC API security 데모를 위한 의도적인 BOLA/IDOR 취약점이다
// (traffic-generator의 cross-user probe와 짝을 이룬다). 여기에 소유권
// 검사를 추가하면 이 데모가 보여주고자 하는 취약점 자체가 사라진다.
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
