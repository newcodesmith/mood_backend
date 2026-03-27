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
    const requestedDate = typeof req.query.date === 'string' ? req.query.date : '';
    const isValidDate = /^\d{4}-\d{2}-\d{2}$/.test(requestedDate);
    const utcToday = new Date().toISOString().split('T')[0];
    const primaryDate = isValidDate ? requestedDate : utcToday;

    let entry = await MoodEntry.getByDate(req.params.userId, primaryDate);

    // Transitional fallback for entries created with older UTC date logic.
    if (!entry && isValidDate && requestedDate !== utcToday) {
      entry = await MoodEntry.getByDate(req.params.userId, utcToday);
    }

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

// Get entry for a specific date
router.get('/user/:userId/by-date', requireSelf, async (req, res) => {
  try {
    const requestedDate = typeof req.query.date === 'string' ? req.query.date : '';

    if (!/^\d{4}-\d{2}-\d{2}$/.test(requestedDate)) {
      return res.status(400).json({ error: 'A valid date is required' });
    }

    const entry = await MoodEntry.getByDate(req.params.userId, requestedDate);
    res.json(entry || null);
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
router.post('/', async (req, res) => {
  try {
    const { date, mood, feelings, reflection, sleep } = req.body;
    const userId = req.user.userId;
    
    // Validation
    if (!date || !mood || !feelings) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Date must be in YYYY-MM-DD format' });
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

    const existingEntry = await MoodEntry.getByDate(userId, date);
    if (existingEntry) {
      return res.status(409).json({ error: 'You already have an entry for this date' });
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
    if (error && error.code === '23505') {
      return res.status(409).json({ error: 'You already have an entry for this date' });
    }
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

    const currentMood = Number(current.mood) || 0;
    const previousMood = Number(previous.mood) || 0;
    const currentSleep = Number(current.sleep) || 0;
    const previousSleep = Number(previous.sleep) || 0;

    const calculatePercentChange = (currentValue, previousValue, hasBaseline) => {
      if (!hasBaseline || previousValue === 0) {
        return 0;
      }

      return Number((((currentValue - previousValue) / previousValue) * 100).toFixed(1));
    };

    const moodChange = calculatePercentChange(currentMood, previousMood, Number(previous.entryCount) > 0);
    const sleepChange = calculatePercentChange(currentSleep, previousSleep, Number(previous.sleepEntryCount) > 0);
    
    res.json({
      current,
      previous,
      moodChange,
      sleepChange
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
