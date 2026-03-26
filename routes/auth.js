const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const { validatePassword } = require('../utils/password');

const router = express.Router();

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function signToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET || 'dev-only-jwt-secret-change-me',
    { expiresIn: '7d' }
  );
}

function hashResetToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, avatar } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!name || !normalizedEmail || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ error: 'Email format is invalid' });
    }

    const passwordIssues = validatePassword(password);
    if (passwordIssues.length > 0) {
      return res.status(400).json({ error: 'Password validation failed', issues: passwordIssues });
    }

    const existingUser = await User.getByEmail(normalizedEmail);
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      password_hash: passwordHash,
      avatar: avatar || null
    });

    const token = signToken(user);
    return res.status(201).json({ token, user });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const userWithSecret = await User.getByEmailWithSecret(normalizedEmail);
    if (!userWithSecret || !userWithSecret.password_hash) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, userWithSecret.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = await User.getById(userWithSecret.id);
    const token = signToken(user);

    return res.json({ token, user });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.getById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json(user);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const normalizedEmail = normalizeEmail(req.body?.email);

    // Always return the same response to avoid account enumeration.
    const genericResponse = {
      message: 'If that email exists, a password reset link has been sent.'
    };

    if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
      return res.json(genericResponse);
    }

    const user = await User.getByEmailWithSecret(normalizedEmail);
    if (!user || !user.password_hash) {
      return res.json(genericResponse);
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashResetToken(resetToken);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    await User.setPasswordResetToken(user.id, tokenHash, expiresAt);

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/?resetToken=${resetToken}`;

    // Replace this with an email provider integration in production.
    console.log(`Password reset requested for ${normalizedEmail}: ${resetUrl}`);

    if (process.env.NODE_ENV !== 'production') {
      return res.json({ ...genericResponse, resetUrl });
    }

    return res.json(genericResponse);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { token, password, confirmPassword } = req.body || {};

    if (!token || !password) {
      return res.status(400).json({ error: 'Token and password are required' });
    }

    if (confirmPassword !== undefined && password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    const passwordIssues = validatePassword(password);
    if (passwordIssues.length > 0) {
      return res.status(400).json({ error: 'Password validation failed', issues: passwordIssues });
    }

    const tokenHash = hashResetToken(token);
    const user = await User.getByResetTokenHash(tokenHash);

    if (!user || !user.reset_token_expires_at || new Date(user.reset_token_expires_at) < new Date()) {
      return res.status(400).json({ error: 'Reset token is invalid or expired' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await User.updatePasswordHash(user.id, passwordHash);

    return res.json({ message: 'Password has been reset successfully' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
