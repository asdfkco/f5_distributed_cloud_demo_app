// Common: POST /api/v1/auth/login, POST /api/v1/auth/refresh
const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { users, verifyPassword } = require('../data/seed');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

function issueTokens(user) {
  const accessToken = jwt.sign(
    { sub: user.id, username: user.username, type: 'access' },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' },
  );
  const refreshToken = jwt.sign(
    { sub: user.id, username: user.username, type: 'refresh', jti: crypto.randomUUID() },
    JWT_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d' },
  );
  return { accessToken, refreshToken };
}

router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  const user = users.find((u) => u.username === username);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ error: 'invalid_credentials' });
  }
  const { accessToken, refreshToken } = issueTokens(user);
  return res.json({
    accessToken,
    refreshToken,
    tokenType: 'Bearer',
    expiresIn: 900,
    user: { id: user.id, username: user.username, displayName: user.displayName },
  });
});

router.post('/refresh', (req, res) => {
  const { refreshToken } = req.body || {};
  if (!refreshToken) return res.status(400).json({ error: 'refresh_token_required' });
  try {
    const payload = jwt.verify(refreshToken, JWT_SECRET);
    if (payload.type !== 'refresh') return res.status(401).json({ error: 'invalid_token_type' });
    const user = users.find((u) => u.id === payload.sub);
    if (!user) return res.status(401).json({ error: 'invalid_token' });
    const tokens = issueTokens(user);
    return res.json({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, tokenType: 'Bearer', expiresIn: 900 });
  } catch (err) {
    return res.status(401).json({ error: 'invalid_or_expired_refresh_token' });
  }
});

module.exports = router;
