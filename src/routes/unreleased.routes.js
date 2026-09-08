// Code-only (docs/ENDPOINT-MATRIX.md B 섹션 참고):
// GET  /api/v1/beneficiaries
// GET  /api/v1/statements/{year}/{month}
// POST /api/v1/loans/apply
//
// 이 라우트들은 /api/v1 하위에 있지만 위쪽의 실제 서비스 중인 v1
// 라우트 파일들과는 별도로 처리되므로, app root에 마운트되어 있다.
// traffic-generator는 이 세 엔드포인트 중 어느 것도 절대 호출하지 않는다.
const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { accounts } = require('../data/seed');

const router = express.Router();

const FEATURE_LOANS_ENABLED = String(process.env.FEATURE_LOANS_ENABLED || 'false').toLowerCase() === 'true';

// CODE-ONLY: 새로운 beneficiaries UI 플로우로 대체되었다. 더 이상 이
// 엔드포인트를 가리키는 클라이언트 링크는 없지만, 라우트는 그대로
// 등록되어 있다.
router.get('/api/v1/beneficiaries', requireAuth, (req, res) => res.json({ beneficiaries: [] }));

// CODE-ONLY: statements 기능은 아직 고객에게 출시되지 않았다.
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

// CODE-ONLY: loans 기능은 FEATURE_LOANS_ENABLED 뒤에 숨겨져 있으며
// 비활성화된 동안에는 503을 반환한다. 하지만 코드 스캐너가 이 라우트를
// 인식할 수 있도록 라우트 등록 자체는 반드시 유지되어야 한다.
router.post('/api/v1/loans/apply', requireAuth, (req, res) => {
  if (!FEATURE_LOANS_ENABLED) {
    return res.status(503).json({ error: 'feature_disabled', message: 'Loan applications are not yet available.' });
  }
  return res.status(201).json({ status: 'submitted' });
});

module.exports = router;
