const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'shivagold_super_secret_jwt_key_2026';

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];

  if (!token && req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token.' });
  }
};

const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({ error: 'Access denied. Role not found.' });
    }

    const userRole = req.user.role.toUpperCase();
    const allowedRolesUpper = allowedRoles.map(r => r.toUpperCase());

    if (!allowedRolesUpper.includes(userRole)) {
      return res.status(403).json({ error: `Access denied. Requires role: ${allowedRoles.join(' or ')}` });
    }

    next();
  };
};

module.exports = {
  authenticateToken,
  authorizeRoles,
  JWT_SECRET
};
