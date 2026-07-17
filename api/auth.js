/**
 * Authentication middleware & helpers
 * Handles token validation and user authentication
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

/**
 * Verify JWT token
 */
function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return { valid: true, decoded };
  } catch (err) {
    return { valid: false, error: err.message };
  }
}

/**
 * Generate JWT token
 */
function generateToken(username, expiresIn = '24h') {
  return jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn });
}

/**
 * Hash password with bcrypt
 */
async function hashPassword(password) {
  const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 10);
  return bcrypt.hash(password, salt);
}

/**
 * Verify password
 */
async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * CORS middleware
 */
function corsMiddleware(req, res) {
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',');
  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }
  return false;
}

/**
 * Input validation
 */
function validateInput(data, schema) {
  const errors = {};

  for (const [key, rules] of Object.entries(schema)) {
    const value = data[key];

    if (rules.required && !value) {
      errors[key] = `${key} diperlukan`;
      continue;
    }

    if (rules.minLength && value && value.length < rules.minLength) {
      errors[key] = `${key} minimal ${rules.minLength} karakter`;
    }

    if (rules.email && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      errors[key] = `${key} format tidak valid`;
    }

    if (rules.pattern && value && !rules.pattern.test(value)) {
      errors[key] = `${key} format tidak valid`;
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

module.exports = {
  verifyToken,
  generateToken,
  hashPassword,
  verifyPassword,
  corsMiddleware,
  validateInput
};
