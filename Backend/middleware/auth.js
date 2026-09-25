const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'Access denied. No token provided.' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) return res.status(401).json({ message: 'Invalid token.' });
    if (user.status === 'inactive') return res.status(403).json({ message: 'Account inactive.' });

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token.' });
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Insufficient permissions.' });
  }
  next();
};

const requireAccess = (section) => (req, res, next) => {
  if (req.user.role === 'main_admin') return next();
  if (!req.user.accessSections?.includes(section)) {
    return res.status(403).json({ message: `No access to ${section}` });
  }
  next();
};

module.exports = { auth, requireRole, requireAccess };
