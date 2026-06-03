const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { supabase } = require('../db/supabase');
const { JWT_SECRET } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    // Fetch user by email
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (error) {
      console.error('Database error during login:', error.message);
      return res.status(500).json({ error: 'Server database error during login' });
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid email address or password.' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Your account is deactivated.' });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email address or password.' });
    }

    // Sign JWT
    const token = jwt.sign(
      {
        id: user.id,
        name: user.name,
        mobile: user.mobile,
        role: user.role,
        email: user.email,
        branch_id: user.branch_id
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        mobile: user.mobile,
        role: user.role,
        email: user.email
      }
    });

  } catch (err) {
    console.error('Server error during login:', err);
    return res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
});

// GET /api/auth/me (Get profile of current logged in user)
const { authenticateToken } = require('../middleware/auth');
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, mobile, email, role, status, branch_id')
      .eq('id', req.user.id)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json(user);
  } catch (err) {
    return res.status(500).json({ error: 'Server error fetching user details' });
  }
});

module.exports = router;
