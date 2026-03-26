const express = require('express');
const bcrypt = require('bcryptjs');
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
    const { email } = req.body || {};
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
      return res.status(400).json({ error: 'A valid email address is required' });
    }

    const user = await User.getByEmail(normalizedEmail);
    if (!user) {
      return res.status(404).json({ error: 'No account found with that email address.' });
    }

    return res.json({ message: 'Email verified.' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { email, newPassword, confirmPassword } = req.body || {};
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: 'Email, new password, and confirmation are required' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    const passwordIssues = validatePassword(newPassword);
    if (passwordIssues.length > 0) {
      return res.status(400).json({ error: 'Password validation failed', issues: passwordIssues });
    }

    const user = await User.getByEmail(normalizedEmail);
    if (!user) {
      return res.status(404).json({ error: 'No account found with that email address.' });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 12);
    await User.updatePasswordHash(user.id, newPasswordHash);

    return res.json({ message: 'Password reset successfully.' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body || {};

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: 'Current password, new password, and confirmation are required' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'New passwords do not match' });
    }

    const passwordIssues = validatePassword(newPassword);
    if (passwordIssues.length > 0) {
      return res.status(400).json({ error: 'Password validation failed', issues: passwordIssues });
    }

    const userWithSecret = await User.getByIdWithSecret(req.user.userId);
    if (!userWithSecret || !userWithSecret.password_hash) {
      return res.status(404).json({ error: 'User not found' });
    }

    const currentMatches = await bcrypt.compare(currentPassword, userWithSecret.password_hash);
    if (!currentMatches) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const sameAsCurrent = await bcrypt.compare(newPassword, userWithSecret.password_hash);
    if (sameAsCurrent) {
      return res.status(400).json({ error: 'New password must be different from current password' });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 12);
    await User.updatePasswordHash(req.user.userId, newPasswordHash);

    return res.json({ message: 'Password updated successfully' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
