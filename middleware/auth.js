const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-only-jwt-secret-change-me');
    req.user = payload;
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireSelf(req, res, next) {
  const userId = Number(req.params.id || req.params.userId || req.body.userId);
  const authedUserId = Number(req.user && req.user.userId);

  if (!userId || !authedUserId || userId !== authedUserId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  return next();
}

module.exports = { authenticateToken, requireSelf };
