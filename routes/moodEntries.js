const express = require('express');
const router = express.Router();
const { MoodEntry } = require('../models');
const { authenticateToken, requireSelf } = require('../middleware/auth');

router.use(authenticateToken);

// Get all mood entries for a user
router.get('/user/:userId', requireSelf, async (req, res) => {
  try {
    const entries = await MoodEntry.getAll(req.params.userId);
    res.json(entries);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get today's entry for a user
router.get('/user/:userId/today', requireSelf, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const entry = await MoodEntry.getByDate(req.params.userId, today);
    res.json(entry || null);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get recent entries (last 11 for chart)
router.get('/user/:userId/recent', requireSelf, async (req, res) => {
  try {
    const entries = await MoodEntry.getRecent(req.params.userId, 11);
    res.json(entries.reverse());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get entry by ID
router.get('/:id', async (req, res) => {
  try {
    const entry = await MoodEntry.getById(req.params.id);
    if (!entry) return res.status(404).json({ error: 'Entry not found' });
    if (entry.user_id !== req.user.userId) return res.status(403).json({ error: 'Forbidden' });
    res.json(entry);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create mood entry
router.post('/', requireSelf, async (req, res) => {
  try {
    const { userId, date, mood, feelings, reflection, sleep } = req.body;
    
    // Validation
    if (!userId || !date || !mood || !feelings) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (mood < 1 || mood > 10) {
      return res.status(400).json({ error: 'Mood must be between 1 and 10' });
    }
    if (sleep && (sleep < 0 || sleep > 24)) {
      return res.status(400).json({ error: 'Sleep must be between 0 and 24' });
    }
    if (!Array.isArray(feelings) || feelings.length === 0) {
      return res.status(400).json({ error: 'At least one feeling is required' });
    }
    
    const entry = await MoodEntry.create({
      user_id: userId,
      date,
      mood,
      feelings: JSON.stringify(feelings),
      reflection,
      sleep
    });
    
    res.status(201).json(entry);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update mood entry
router.put('/:id', async (req, res) => {
  try {
    const existing = await MoodEntry.getById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Entry not found' });
    if (existing.user_id !== req.user.userId) return res.status(403).json({ error: 'Forbidden' });

    const { mood, feelings, reflection, sleep } = req.body;
    
    if (mood && (mood < 1 || mood > 10)) {
      return res.status(400).json({ error: 'Mood must be between 1 and 10' });
    }
    if (sleep && (sleep < 0 || sleep > 24)) {
      return res.status(400).json({ error: 'Sleep must be between 0 and 24' });
    }
    
    const updateData = {};
    if (mood) updateData.mood = mood;
    if (feelings) updateData.feelings = JSON.stringify(feelings);
    if (reflection !== undefined) updateData.reflection = reflection;
    if (sleep !== undefined) updateData.sleep = sleep;
    
    const entry = await MoodEntry.update(req.params.id, updateData);
    res.json(entry);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete mood entry
router.delete('/:id', async (req, res) => {
  try {
    const existing = await MoodEntry.getById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Entry not found' });
    if (existing.user_id !== req.user.userId) return res.status(403).json({ error: 'Forbidden' });

    await MoodEntry.delete(req.params.id);
    res.json({ message: 'Entry deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get comparisons
router.get('/user/:userId/comparison', requireSelf, async (req, res) => {
  try {
    const current = await MoodEntry.getAverageCurrentWeek(req.params.userId);
    const previous = await MoodEntry.getAveragePreviousWeek(req.params.userId);
    
    const moodChange = ((current.mood - previous.mood) / (previous.mood || 1) * 100).toFixed(1);
    const sleepChange = ((current.sleep - previous.sleep) / (previous.sleep || 1) * 100).toFixed(1);
    
    res.json({
      current,
      previous,
      moodChange: parseFloat(moodChange),
      sleepChange: parseFloat(sleepChange)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
