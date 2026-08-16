/**
 * Login endpoint
 * POST /api/login
 * Body: { username, password }
 */

const { corsMiddleware, verifyPassword, generateToken, validateInput } = require('./auth');
const { findUser } = require('./github');

const VALIDATION_SCHEMA = {
  username: {
    required: true,
    minLength: 3
  },
  password: {
    required: true,
    minLength: 6
  }
};

module.exports = async (req, res) => {
  // Handle CORS
  if (corsMiddleware(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { username, password } = req.body;

    // Validate input
    const validation = validateInput({ username, password }, VALIDATION_SCHEMA);
    if (!validation.valid) {
      return res.status(400).json({ error: 'Validasi gagal', details: validation.errors });
    }

    // Find user
    const user = await findUser(username);
    if (!user) {
      return res.status(401).json({ error: 'Username atau password salah' });
    }

    // Verify password
    const passwordMatch = await verifyPassword(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Username atau password salah' });
    }

    // Generate JWT token
    const token = generateToken(username);

    res.status(200).json({
      success: true,
      message: 'Login berhasil',
      token: token,
      user: {
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Terjadi kesalahan pada server'
    });
  }
};
