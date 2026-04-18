const router      = require('express').Router();
const db          = require('../db');
const requireAuth = require('../middleware/auth');

// ── GET /api/push/vapid-public-key ──────────────────────────────────────────
// Frontend henter den offentlige VAPID-nøgle
router.get('/vapid-public-key', (req, res) => {
  const key = process.env.VAPID_PUBLIC || '';
  if (!key) return res.status(503).json({ error: 'Push ikke konfigureret' });
  return res.json({ key });
});

// ── POST /api/push/subscribe ─────────────────────────────────────────────────
router.post('/subscribe', requireAuth, (req, res) => {
  const { endpoint, keys } = req.body;
  if (!endpoint || !keys?.p256dh || !keys?.auth)
    return res.status(400).json({ error: 'Ugyldig subscription' });

  try {
    db.prepare(`
      INSERT OR REPLACE INTO push_subscriptions (user_id, endpoint, p256dh, auth)
      VALUES (?, ?, ?, ?)
    `).run(req.user.id, endpoint, keys.p256dh, keys.auth);

    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: 'Serverfejl' });
  }
});

// ── DELETE /api/push/subscribe ───────────────────────────────────────────────
router.delete('/subscribe', requireAuth, (req, res) => {
  const { endpoint } = req.body;
  if (endpoint) {
    db.prepare('DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?')
      .run(req.user.id, endpoint);
  } else {
    db.prepare('DELETE FROM push_subscriptions WHERE user_id = ?').run(req.user.id);
  }
  return res.json({ ok: true });
});

module.exports = router;
