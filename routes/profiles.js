const router      = require('express').Router();
const multer      = require('multer');
const path        = require('path');
const fs          = require('fs');
const db          = require('../db');
const requireAuth = require('../middleware/auth');
const { notifyLike, notifyMatch } = require('../services/push');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../public/uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `user_${req.user.id}_${Date.now()}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => { const ok = /jpeg|jpg|png|webp/.test(file.mimetype); cb(ok ? null : new Error('Kun billeder'), ok); }
});

router.get('/', (req, res) => {
  const { gender, seeking, city, min_age, max_age, online, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  let where = ['p.display_name IS NOT NULL'];
  const params = [];
  if (gender)  { where.push('p.gender = ?');  params.push(gender); }
  if (seeking) { where.push('p.seeking = ?'); params.push(seeking); }
  if (city)    { where.push('p.city LIKE ?'); params.push(`%${city}%`); }
  if (min_age) { where.push('p.age >= ?');    params.push(parseInt(min_age)); }
  if (max_age) { where.push('p.age <= ?');    params.push(parseInt(max_age)); }
  if (online === '1') { where.push('p.is_online = 1'); }
  const sql = `SELECT p.*, u.premium FROM profiles p JOIN users u ON u.id = p.user_id WHERE ${where.join(' AND ')} ORDER BY u.premium DESC, p.is_online DESC, p.last_seen DESC LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), offset);
  const profiles = db.prepare(sql).all(...params);
  const total    = db.prepare(`SELECT COUNT(*) as n FROM profiles p WHERE ${where.join(' AND ')}`).get(...params.slice(0,-2)).n;
  return res.json({ profiles, total, page: parseInt(page) });
});

router.get('/online', (req, res) => {
  return res.json(db.prepare('SELECT p.user_id, p.display_name, p.age, p.city, p.photo, p.is_online FROM profiles p WHERE p.is_online = 1 LIMIT 50').all());
});

router.get('/:id', (req, res) => {
  const p = db.prepare('SELECT p.*, u.username, u.premium FROM profiles p JOIN users u ON u.id = p.user_id WHERE p.user_id = ?').get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Profil ikke fundet' });
  return res.json(p);
});

router.put('/me', requireAuth, (req, res) => {
  const { display_name, age, gender, seeking, city, bio } = req.body;
  db.prepare(`UPDATE profiles SET display_name=COALESCE(?,display_name), age=COALESCE(?,age), gender=COALESCE(?,gender), seeking=COALESCE(?,seeking), city=COALESCE(?,city), bio=COALESCE(?,bio), updated_at=datetime('now') WHERE user_id=?`)
    .run(display_name, age, gender, seeking, city, bio, req.user.id);
  return res.json({ ok: true });
});

router.post('/me/photo', requireAuth, upload.single('photo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Ingen fil' });
  const url = `/uploads/${req.file.filename}`;
  db.prepare('UPDATE profiles SET photo=? WHERE user_id=?').run(url, req.user.id);
  return res.json({ photo: url });
});

router.post('/:id/like', requireAuth, async (req, res) => {
  const toUser = parseInt(req.params.id);
  if (toUser === req.user.id) return res.status(400).json({ error: 'Du kan ikke like dig selv' });
  try {
    db.prepare('INSERT OR IGNORE INTO likes (from_user, to_user) VALUES (?, ?)').run(req.user.id, toUser);
    const match  = db.prepare('SELECT 1 FROM likes WHERE from_user=? AND to_user=?').get(toUser, req.user.id);
    const sender = db.prepare('SELECT display_name FROM profiles WHERE user_id=?').get(req.user.id);
    const name   = sender?.display_name || 'En bruger';
    if (match) { notifyMatch(toUser, name).catch(() => {}); }
    else       { notifyLike(toUser, name).catch(() => {}); }
    return res.json({ ok: true, match: !!match });
  } catch { return res.status(500).json({ error: 'Serverfejl' }); }
});

router.delete('/:id/like', requireAuth, (req, res) => {
  db.prepare('DELETE FROM likes WHERE from_user=? AND to_user=?').run(req.user.id, parseInt(req.params.id));
  return res.json({ ok: true });
});

module.exports = router;
