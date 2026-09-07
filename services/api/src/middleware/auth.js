const jwt = require('jsonwebtoken');

// Demo-only secret. In this repo it is always overridden by the JWT_SECRET
// env var (see .env.example); the fallback exists only so the app can boot
// in a pinch during local hacking.
const JWT_SECRET = process.env.JWT_SECRET || 'demo-only-change-me-1234567890';

/**
 * Applied to Common and Code-only routes. Most Shadow (runtime-loaded)
 * routes intentionally do NOT use this middleware -- that is the point of
 * the demo (see src/dynamic/loader.js and deploy/shadow-routes.example.json).
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
