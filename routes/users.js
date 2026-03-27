const express = require('express');
const router = express.Router();
const { User } = require('../models');
const { authenticateToken, requireSelf } = require('../middleware/auth');

router.use(authenticateToken);

// Get all users
router.get('/', async (req, res) => {
  try {
    const users = await User.getAll();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user by ID
router.get('/:id', requireSelf, async (req, res) => {
  try {
    const user = await User.getById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create user
router.post('/', async (req, res) => {
  try {
    const { name, avatar, email } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    
    const user = await User.create({ name, avatar, email: email || null });
    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user
router.put('/:id', requireSelf, async (req, res) => {
  try {
    const { name, avatar, themePreference, theme_preference } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const normalizedThemePreference = (themePreference || theme_preference || 'light').toString().toLowerCase();
    if (!['light', 'dark'].includes(normalizedThemePreference)) {
      return res.status(400).json({ error: 'Theme preference must be light or dark' });
    }
    
    const user = await User.update(req.params.id, {
      name,
      avatar,
      theme_preference: normalizedThemePreference
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete user
router.delete('/:id', requireSelf, async (req, res) => {
  try {
    await User.delete(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
