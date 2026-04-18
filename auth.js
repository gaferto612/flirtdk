const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'skift-dette-til-noget-hemmeligt';

module.exports = function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Ikke logget ind' });
  }
  try {
    const token   = header.slice(7);
    req.user      = jwt.verify(token, SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Ugyldig eller udløbet token' });
  }
};
