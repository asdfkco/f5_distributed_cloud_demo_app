// Shadow 라우트 핸들러 레지스트리. 이름만 키로 쓴다.
// 이 파일에는 엔드포인트 경로 문자열이 일부러 하나도 없다.
// 실제 경로는 git에 추적되지 않는 deploy/runtime/shadow-routes.json에만
// 존재한다. 파일 형식은 deploy/shadow-routes.example.json 참고.
const { users, accounts, cards } = require('../data/seed');

function adminUsersDump(req, res) {
  res.json({
    users: users.map((u) => ({ id: u.id, username: u.username, email: u.email, displayName: u.displayName, rrn: u.rrn })),
  });
}

function debugConfig(req, res) {
  res.json({
    nodeEnv: process.env.NODE_ENV || 'development',
    port: process.env.PORT || '8080',
    jwtSecretPreview: `${(process.env.JWT_SECRET || '').slice(0, 4)}***`,
    featureLoansEnabled: process.env.FEATURE_LOANS_ENABLED || 'false',
    internalDbUrl: 'postgres://bankdemo:demo-only@10.0.4.12:5432/bankdemo',
  });
}

function metricsPiiExport(req, res) {
  const rows = ['user_id,username,rrn,card_pan'];
  for (const u of users) {
    const card = cards.find((c) => c.userId === u.id);
    rows.push(`${u.id},${u.username},${u.rrn},${card ? card.pan : ''}`);
  }
  res.type('text/csv').send(rows.join('\n'));
}

function opsReconcile(req, res) {
  res.json({ status: 'accepted', jobId: `reconcile_${Date.now()}`, message: 'Reconciliation batch triggered' });
}

function accountBalanceV2(req, res) {
  const account = accounts.find((a) => a.id === req.params.accountId);
  if (!account) return res.status(404).json({ error: 'not_found' });
  return res.json({ accountId: account.id, balance: account.balance, currency: account.currency, asOf: new Date().toISOString() });
}

function partnerKycCallback(req, res) {
  res.json({ received: true, ackId: `kyc_${Date.now()}` });
}

module.exports = {
  adminUsersDump,
  debugConfig,
  metricsPiiExport,
  opsReconcile,
  accountBalanceV2,
  partnerKycCallback,
};
