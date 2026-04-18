const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const crypto  = require('crypto');
const db      = require('../db');
const requireAuth = require('../middleware/auth');
const { sendVerification } = require('../services/email');

const SECRET = process.env.JWT_SECRET || 'skift-dette-til-noget-hemmeligt';
const sign   = (id) => jwt.sign({ id }, SECRET, { expiresIn: '30d' });

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password)
    return res.status(400).json({ error: 'Alle felter skal udfyldes' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Adgangskode skal vaere mindst 6 tegn' });

  try {
    const hash        = await bcrypt.hash(password, 12);
    const verifyToken = crypto.randomBytes(32).toString('hex');
    const result = db.prepare(
      'INSERT INTO users (username, email, password, verify_token) VALUES (?, ?, ?, ?)'
    ).run(username.trim(), email.toLowerCase().trim(), hash, verifyToken);
    const userId = result.lastInsertRowid;
    db.prepare('INSERT INTO profiles (user_id, display_name) VALUES (?, ?)').run(userId, username.trim());
    try { await sendVerification(email, verifyToken); } catch (e) { console.warn('Mail fejl:', e.message); }
    return res.status(201).json({ token: sign(userId), userId, message: 'Konto oprettet! Tjek din e-mail.' });
  } catch (err) {
    if (err.message.includes('UNIQUE'))
      return res.status(409).json({ error: 'Brugernavn eller e-mail er allerede i brug' });
    return res.status(500).json({ error: 'Serverfejl' });
  }
});

// GET /api/auth/verify?token=xxx
router.get('/verify', (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).send('Ugyldigt link');
  const user = db.prepare('SELECT * FROM users WHERE verify_token = ?').get(token);
  if (!user) return res.status(400).send('Linket er ugyldigt eller udloebet');
  db.prepare('UPDATE users SET verified = 1, verify_token = NULL WHERE id = ?').run(user.id);
  return res.redirect('/?verified=1');
});

// POST /api/auth/resend-verification
router.post('/resend-verification', requireAuth, async (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (user.verified) return res.json({ message: 'E-mail er allerede bekraeftet' });
  const newToken = crypto.randomBytes(32).toString('hex');
  db.prepare('UPDATE users SET verify_token = ? WHERE id = ?').run(newToken, user.id);
  try {
    await sendVerification(user.email, newToken);
    return res.json({ message: 'Ny bekraeftelsese-mail er sendt' });
  } catch { return res.status(500).json({ error: 'E-mail kunne ikke sendes' }); }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'E-mail og adgangskode skal udfyldes' });
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (!user) return res.status(401).json({ error: 'Forkert e-mail eller adgangskode' });
  const ok = await bcrypt.compare(password, user.password);
  if (!ok)  return res.status(401).json({ error: 'Forkert e-mail eller adgangskode' });
  db.prepare("UPDATE profiles SET is_online=1, last_seen=datetime('now') WHERE user_id=?").run(user.id);
  return res.json({ token: sign(user.id), userId: user.id, verified: !!user.verified });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare(
    `SELECT u.id, u.username, u.email, u.verified, u.premium, u.premium_until,
            p.display_name, p.age, p.gender, p.seeking, p.city, p.bio, p.photo, p.is_online
     FROM users u LEFT JOIN profiles p ON p.user_id = u.id WHERE u.id = ?`
  ).get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Bruger ikke fundet' });
  return res.json(user);
});

// POST /api/auth/logout
router.post('/logout', requireAuth, (req, res) => {
  db.prepare("UPDATE profiles SET is_online=0, last_seen=datetime('now') WHERE user_id=?").run(req.user.id);
  return res.json({ ok: true });
});

module.exports = router;
