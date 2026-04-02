const express = require('express');
const router = express.Router();
const { BreathingProfile, User } = require('../models');
const { authenticateToken, requireSelf } = require('../middleware/auth');

router.use(authenticateToken);

const BREATHING_MIN_SECONDS = 1;
const BREATHING_MAX_SECONDS = 60;
const BREATHING_MIN_CYCLES = 1;
const BREATHING_MAX_CYCLES = 50;
const BREATHING_MIN_AUDIO_LEVEL = 0;
const BREATHING_MAX_AUDIO_LEVEL = 0.6;
const BREATHING_COLOR_PALETTES = ['ocean', 'sunrise', 'forest', 'lavender', 'ember'];
const BREATHING_VISUAL_SHAPES = ['orb', 'lotus', 'crystal', 'ripple'];

const normalizeSeconds = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  const rounded = Math.round(parsed);
  return Math.max(BREATHING_MIN_SECONDS, Math.min(BREATHING_MAX_SECONDS, rounded));
};

const normalizeAudioLevel = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  const clamped = Math.max(BREATHING_MIN_AUDIO_LEVEL, Math.min(BREATHING_MAX_AUDIO_LEVEL, parsed));
  return Number(clamped.toFixed(2));
};

const normalizeCycleCount = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  const rounded = Math.round(parsed);
  return Math.max(BREATHING_MIN_CYCLES, Math.min(BREATHING_MAX_CYCLES, rounded));
};

const normalizeProfileName = (value) => String(value || '').trim();
const normalizeColorPalette = (value) => String(value || '').trim().toLowerCase();

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

router.patch('/:id/preferences', requireSelf, async (req, res) => {
  try {
    const {
      breathing_inhale_seconds,
      breathing_hold_seconds,
      breathing_exhale_seconds,
      breathing_cycle_count,
      breathing_audio_enabled,
      breathing_audio_level,
      breathing_color_palette,
      breathing_visual_shape,
      breathingInhaleSeconds,
      breathingHoldSeconds,
      breathingExhaleSeconds,
      breathingCycleCount,
      breathingAudioEnabled,
      breathingAudioLevel,
      breathingColorPalette,
      breathingVisualShape
    } = req.body || {};

    const inhale = normalizeSeconds(
      breathing_inhale_seconds !== undefined ? breathing_inhale_seconds : breathingInhaleSeconds
    );
    const hold = normalizeSeconds(
      breathing_hold_seconds !== undefined ? breathing_hold_seconds : breathingHoldSeconds
    );
    const exhale = normalizeSeconds(
      breathing_exhale_seconds !== undefined ? breathing_exhale_seconds : breathingExhaleSeconds
    );
    const cycleCount = normalizeCycleCount(
      breathing_cycle_count !== undefined ? breathing_cycle_count : breathingCycleCount
    );

    const audioEnabledValue =
      breathing_audio_enabled !== undefined ? breathing_audio_enabled : breathingAudioEnabled;
    const audioLevelValue =
      breathing_audio_level !== undefined ? breathing_audio_level : breathingAudioLevel;
    const audioLevel = normalizeAudioLevel(audioLevelValue);
    const colorPalette = normalizeColorPalette(
      breathing_color_palette !== undefined ? breathing_color_palette : breathingColorPalette
    );
    const visualShape = normalizeColorPalette(
      breathing_visual_shape !== undefined ? breathing_visual_shape : breathingVisualShape
    );

    if (inhale === null || hold === null || exhale === null) {
      return res.status(400).json({
        error: `Breathing phase seconds must be numeric values between ${BREATHING_MIN_SECONDS} and ${BREATHING_MAX_SECONDS}`
      });
    }

    if (cycleCount === null) {
      return res.status(400).json({
        error: `Breathing cycle count must be a numeric value between ${BREATHING_MIN_CYCLES} and ${BREATHING_MAX_CYCLES}`
      });
    }

    if (typeof audioEnabledValue !== 'boolean') {
      return res.status(400).json({ error: 'Breathing audio enabled must be true or false' });
    }

    if (audioLevel === null) {
      return res.status(400).json({
        error: `Breathing audio level must be a number between ${BREATHING_MIN_AUDIO_LEVEL} and ${BREATHING_MAX_AUDIO_LEVEL}`
      });
    }

    if (!BREATHING_COLOR_PALETTES.includes(colorPalette)) {
      return res.status(400).json({
        error: `Breathing color palette must be one of: ${BREATHING_COLOR_PALETTES.join(', ')}`
      });
    }

    if (!BREATHING_VISUAL_SHAPES.includes(visualShape)) {
      return res.status(400).json({
        error: `Breathing visual shape must be one of: ${BREATHING_VISUAL_SHAPES.join(', ')}`
      });
    }

    const user = await User.update(req.params.id, {
      breathing_inhale_seconds: inhale,
      breathing_hold_seconds: hold,
      breathing_exhale_seconds: exhale,
      breathing_cycle_count: cycleCount,
      breathing_audio_enabled: audioEnabledValue,
      breathing_audio_level: audioLevel,
      breathing_color_palette: colorPalette,
      breathing_visual_shape: visualShape
    });

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id/breathing-profiles', requireSelf, async (req, res) => {
  try {
    const profiles = await BreathingProfile.getAllForUser(req.params.id);
    res.json(profiles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/breathing-profiles', requireSelf, async (req, res) => {
  try {
    const {
      name,
      inhale_seconds,
      hold_seconds,
      exhale_seconds,
      audio_enabled,
      audio_level,
      inhaleSeconds,
      holdSeconds,
      exhaleSeconds,
      audioEnabled,
      audioLevel
    } = req.body || {};

    const normalizedName = normalizeProfileName(name);
    const inhale = normalizeSeconds(inhale_seconds !== undefined ? inhale_seconds : inhaleSeconds);
    const hold = normalizeSeconds(hold_seconds !== undefined ? hold_seconds : holdSeconds);
    const exhale = normalizeSeconds(exhale_seconds !== undefined ? exhale_seconds : exhaleSeconds);
    const normalizedAudioEnabled = audio_enabled !== undefined ? audio_enabled : audioEnabled;
    const normalizedAudioLevel = normalizeAudioLevel(audio_level !== undefined ? audio_level : audioLevel);

    if (!normalizedName) {
      return res.status(400).json({ error: 'Profile name is required' });
    }

    if (normalizedName.length > 80) {
      return res.status(400).json({ error: 'Profile name must be 80 characters or less' });
    }

    if (inhale === null || hold === null || exhale === null) {
      return res.status(400).json({
        error: `Breathing phase seconds must be numeric values between ${BREATHING_MIN_SECONDS} and ${BREATHING_MAX_SECONDS}`
      });
    }

    if (typeof normalizedAudioEnabled !== 'boolean') {
      return res.status(400).json({ error: 'Breathing audio enabled must be true or false' });
    }

    if (normalizedAudioLevel === null) {
      return res.status(400).json({
        error: `Breathing audio level must be a number between ${BREATHING_MIN_AUDIO_LEVEL} and ${BREATHING_MAX_AUDIO_LEVEL}`
      });
    }

    const profile = await BreathingProfile.create({
      user_id: req.params.id,
      name: normalizedName,
      inhale_seconds: inhale,
      hold_seconds: hold,
      exhale_seconds: exhale,
      audio_enabled: normalizedAudioEnabled,
      audio_level: normalizedAudioLevel
    });

    res.status(201).json(profile);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/:id/breathing-profiles/:profileId', requireSelf, async (req, res) => {
  try {
    const {
      name,
      inhale_seconds,
      hold_seconds,
      exhale_seconds,
      audio_enabled,
      audio_level,
      inhaleSeconds,
      holdSeconds,
      exhaleSeconds,
      audioEnabled,
      audioLevel
    } = req.body || {};

    const existingProfile = await BreathingProfile.getByIdForUser(req.params.id, req.params.profileId);
    if (!existingProfile) {
      return res.status(404).json({ error: 'Breathing profile not found' });
    }

    const normalizedName = normalizeProfileName(name);
    const inhale = normalizeSeconds(inhale_seconds !== undefined ? inhale_seconds : inhaleSeconds);
    const hold = normalizeSeconds(hold_seconds !== undefined ? hold_seconds : holdSeconds);
    const exhale = normalizeSeconds(exhale_seconds !== undefined ? exhale_seconds : exhaleSeconds);
    const normalizedAudioEnabled = audio_enabled !== undefined ? audio_enabled : audioEnabled;
    const normalizedAudioLevel = normalizeAudioLevel(audio_level !== undefined ? audio_level : audioLevel);

    if (!normalizedName) {
      return res.status(400).json({ error: 'Profile name is required' });
    }

    if (normalizedName.length > 80) {
      return res.status(400).json({ error: 'Profile name must be 80 characters or less' });
    }

    if (inhale === null || hold === null || exhale === null) {
      return res.status(400).json({
        error: `Breathing phase seconds must be numeric values between ${BREATHING_MIN_SECONDS} and ${BREATHING_MAX_SECONDS}`
      });
    }

    if (typeof normalizedAudioEnabled !== 'boolean') {
      return res.status(400).json({ error: 'Breathing audio enabled must be true or false' });
    }

    if (normalizedAudioLevel === null) {
      return res.status(400).json({
        error: `Breathing audio level must be a number between ${BREATHING_MIN_AUDIO_LEVEL} and ${BREATHING_MAX_AUDIO_LEVEL}`
      });
    }

    const updatedProfile = await BreathingProfile.updateForUser(req.params.id, req.params.profileId, {
      name: normalizedName,
      inhale_seconds: inhale,
      hold_seconds: hold,
      exhale_seconds: exhale,
      audio_enabled: normalizedAudioEnabled,
      audio_level: normalizedAudioLevel
    });

    res.json(updatedProfile);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id/breathing-profiles/:profileId', requireSelf, async (req, res) => {
  try {
    const existingProfile = await BreathingProfile.getByIdForUser(req.params.id, req.params.profileId);
    if (!existingProfile) {
      return res.status(404).json({ error: 'Breathing profile not found' });
    }

    await BreathingProfile.deleteForUser(req.params.id, req.params.profileId);
    res.json({ message: 'Breathing profile deleted' });
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
