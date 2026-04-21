const router      = require('express').Router();
const db          = require('../db');
const requireAuth = require('../middleware/auth');
const { notifyNewMessage } = require('../services/push');

router.use(requireAuth);

router.get('/unread/count', (req, res) => {
  const row = db.prepare('SELECT COUNT(*) as n FROM messages WHERE to_user = ? AND read = 0').get(req.user.id);
  return res.json({ count: row.n });
});

router.get('/inbox', (req, res) => {
  const uid = req.user.id;
  const threads = db.prepare(`
    SELECT
      u.other_user,
      p.display_name, p.photo, p.is_online,
      (SELECT body FROM messages m2
       WHERE (m2.from_user = u.other_user AND m2.to_user = ?)
          OR (m2.from_user = ? AND m2.to_user = u.other_user)
       ORDER BY m2.created_at DESC, m2.id DESC LIMIT 1) AS last_message,
      (SELECT created_at FROM messages m2
       WHERE (m2.from_user = u.other_user AND m2.to_user = ?)
          OR (m2.from_user = ? AND m2.to_user = u.other_user)
       ORDER BY m2.created_at DESC, m2.id DESC LIMIT 1) AS created_at,
      (SELECT COUNT(*) FROM messages m2
       WHERE m2.from_user = u.other_user AND m2.to_user = ? AND m2.read = 0) AS unread
    FROM (
      SELECT DISTINCT CASE WHEN from_user = ? THEN to_user ELSE from_user END AS other_user
      FROM messages WHERE from_user = ? OR to_user = ?
    ) u
    JOIN profiles p ON p.user_id = u.other_user
    ORDER BY created_at DESC
  `).all(uid, uid, uid, uid, uid, uid, uid, uid);
  return res.json(threads);
});

router.get('/:userId', (req, res) => {
  const other = parseInt(req.params.userId);
  db.prepare('UPDATE messages SET read = 1 WHERE from_user = ? AND to_user = ?').run(other, req.user.id);
  const messages = db.prepare(`
    SELECT m.id, m.from_user, m.to_user, m.body, m.read, m.created_at,
           p.display_name as sender_name, p.photo as sender_photo
    FROM messages m JOIN profiles p ON p.user_id = m.from_user
    WHERE (m.from_user = ? AND m.to_user = ?) OR (m.from_user = ? AND m.to_user = ?)
    ORDER BY m.created_at ASC LIMIT 100
  `).all(req.user.id, other, other, req.user.id);
  return res.json(messages);
});

router.post('/:userId', async (req, res) => {
  const to   = parseInt(req.params.userId);
  const body = req.body.body?.trim();
  if (!body) return res.status(400).json({ error: 'Beskeden maa ikke vaere tom' });
  if (to === req.user.id) return res.status(400).json({ error: 'Du kan ikke skrive til dig selv' });
  const exists = db.prepare('SELECT 1 FROM users WHERE id = ?').get(to);
  if (!exists) return res.status(404).json({ error: 'Bruger ikke fundet' });
  const result = db.prepare('INSERT INTO messages (from_user, to_user, body) VALUES (?, ?, ?)').run(req.user.id, to, body);
  const sender = db.prepare('SELECT display_name FROM profiles WHERE user_id = ?').get(req.user.id);
  notifyNewMessage(to, sender?.display_name || 'En bruger').catch(() => {});
  return res.status(201).json({ id: result.lastInsertRowid, from_user: req.user.id, to_user: to, body, created_at: new Date().toISOString() });
});

module.exports = router;
