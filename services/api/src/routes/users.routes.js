// Common: GET /api/v1/users/me
const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { users } = require('../data/seed');

const router = express.Router();

router.get('/me', requireAuth, (req, res) => {
  const user = users.find((u) => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'not_found' });
  return res.json({ id: user.id, username: user.username, email: user.email, displayName: user.displayName });
});

module.exports = router;
