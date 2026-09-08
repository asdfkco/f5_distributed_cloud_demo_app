const jwt = require('jsonwebtoken');

// 데모 전용 시크릿. 실제로는 JWT_SECRET 환경 변수로 덮어쓴다(.env.example).
// 이 fallback은 로컬에서 환경 변수 없이도 앱이 뜨게 하려고 남겨둔 값이다.
const JWT_SECRET = process.env.JWT_SECRET || 'demo-only-change-me-1234567890';

/**
 * Common과 Code-only 라우트에 적용한다.
 * Shadow 라우트는 대부분 이 미들웨어를 일부러 안 붙인다. 인증 없이 뚫려
 * 있다는 게 이 데모에서 보여주려는 위험이다. src/dynamic/loader.js 참고.
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'unauthorized', message: 'Missing bearer token' });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.type !== 'access') {
      return res.status(401).json({ error: 'unauthorized', message: 'Invalid token type' });
    }
    req.user = { id: payload.sub, username: payload.username };
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'unauthorized', message: 'Invalid or expired token' });
  }
}

module.exports = { requireAuth, JWT_SECRET };
