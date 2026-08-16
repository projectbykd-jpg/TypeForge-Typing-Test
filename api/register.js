/**
 * Register endpoint
 * POST /api/register
 * Body: { username, password, email }
 */

const { corsMiddleware, hashPassword, validateInput } = require('./auth');
const { addUser } = require('./github');

const VALIDATION_SCHEMA = {
  username: {
    required: true,
    minLength: 3,
    pattern: /^[a-zA-Z0-9_-]{3,20}$/
  },
  password: {
    required: true,
    minLength: 6
  },
  email: {
    required: true,
    email: true
  }
};

module.exports = async (req, res) => {
  // Handle CORS
  if (corsMiddleware(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { username, password, email } = req.body;

    // Validate input
    const validation = validateInput({ username, password, email }, VALIDATION_SCHEMA);
    if (!validation.valid) {
      return res.status(400).json({ error: 'Validasi gagal', details: validation.errors });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Add user to GitHub
    const newUser = await addUser(username, hashedPassword, email);

    res.status(201).json({
      success: true,
      message: 'Akun berhasil dibuat',
      user: {
        username: newUser.username,
        email: newUser.email,
        createdAt: newUser.createdAt
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(400).json({
      error: error.message || 'Gagal membuat akun'
    });
  }
};
