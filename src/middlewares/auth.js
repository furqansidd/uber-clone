const jwt = require('jsonwebtoken');
const { TokenBlacklist, User, Captain } = require('../models');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_for_testing_and_dev';

const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization header missing or invalid' });
    }

    const token = authHeader.split(' ')[1];
    
    // Check if blacklisted
    const isBlacklisted = await TokenBlacklist.findOne({ token });
    if (isBlacklisted) {
      return res.status(401).json({ error: 'Token is blacklisted' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'rider') {
      return res.status(401).json({ error: 'Access denied: not a rider' });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    req.token = token;
    req.tokenExpiry = new Date(decoded.exp * 1000);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const authenticateCaptain = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization header missing or invalid' });
    }

    const token = authHeader.split(' ')[1];

    // Check if blacklisted
    const isBlacklisted = await TokenBlacklist.findOne({ token });
    if (isBlacklisted) {
      return res.status(401).json({ error: 'Token is blacklisted' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'captain') {
      return res.status(401).json({ error: 'Access denied: not a captain' });
    }

    const captain = await Captain.findById(decoded.id);
    if (!captain) {
      return res.status(401).json({ error: 'Captain not found' });
    }

    req.captain = captain;
    req.token = token;
    req.tokenExpiry = new Date(decoded.exp * 1000);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const authenticateUserOrCaptain = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization header missing or invalid' });
    }

    const token = authHeader.split(' ')[1];
    const isBlacklisted = await TokenBlacklist.findOne({ token });
    if (isBlacklisted) {
      return res.status(401).json({ error: 'Token is blacklisted' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role === 'rider') {
      const user = await User.findById(decoded.id);
      if (user) {
        req.user = user;
        req.token = token;
        req.tokenExpiry = new Date(decoded.exp * 1000);
        return next();
      }
    } else if (decoded.role === 'captain') {
      const captain = await Captain.findById(decoded.id);
      if (captain) {
        req.captain = captain;
        req.token = token;
        req.tokenExpiry = new Date(decoded.exp * 1000);
        return next();
      }
    }
    return res.status(401).json({ error: 'User or Captain not found' });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

module.exports = {
  authenticateUser,
  authenticateCaptain,
  authenticateUserOrCaptain
};
