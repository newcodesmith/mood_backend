const knex = require('knex');
const config = require('../knexfile');

const db = knex(config[process.env.NODE_ENV || 'development']);
const baseSafeUserColumns = ['id', 'name', 'email', 'avatar', 'created_at', 'updated_at'];
let hasThemePreferenceColumnCache;
const optionalUserColumnsCache = {};

const OPTIONAL_USER_COLUMNS = [
  'theme_preference',
  'breathing_inhale_seconds',
  'breathing_hold_seconds',
  'breathing_exhale_seconds',
  'breathing_cycle_count',
  'breathing_audio_enabled',
  'breathing_audio_level',
  'breathing_color_palette'
];

const OPTIONAL_SAFE_USER_COLUMNS = [
  'breathing_inhale_seconds',
  'breathing_hold_seconds',
  'breathing_exhale_seconds',
  'breathing_cycle_count',
  'breathing_audio_enabled',
  'breathing_audio_level',
  'breathing_color_palette'
];

async function hasOptionalUserColumn(columnName) {
  if (optionalUserColumnsCache[columnName] === true) {
    return true;
  }

  try {
    const hasColumn = await db.schema.hasColumn('users', columnName);
    optionalUserColumnsCache[columnName] = hasColumn ? true : undefined;
    return hasColumn;
  } catch (error) {
    return false;
  }
}

async function hasThemePreferenceColumn() {
  if (hasThemePreferenceColumnCache !== undefined) {
    return hasThemePreferenceColumnCache;
  }

  hasThemePreferenceColumnCache = await hasOptionalUserColumn('theme_preference');
  return hasThemePreferenceColumnCache;
}

async function getSafeUserColumns() {
  const safeUserColumns = [...baseSafeUserColumns];

  const hasThemePreference = await hasThemePreferenceColumn();
  if (hasThemePreference) {
    safeUserColumns.splice(4, 0, 'theme_preference');
  }

  let insertionIndex = hasThemePreference ? 5 : 4;
  for (const columnName of OPTIONAL_SAFE_USER_COLUMNS) {
    if (await hasOptionalUserColumn(columnName)) {
      safeUserColumns.splice(insertionIndex, 0, columnName);
      insertionIndex += 1;
    }
  }

  return safeUserColumns;
}

async function sanitizeUserDataForSchema(userData) {
  const sanitized = { ...userData };

  await Promise.all(
    OPTIONAL_USER_COLUMNS.map(async (columnName) => {
      if (!(await hasOptionalUserColumn(columnName))) {
        delete sanitized[columnName];
      }
    })
  );

  if (Object.prototype.hasOwnProperty.call(sanitized, 'breathing_audio_level')) {
    const numericLevel = Number(sanitized.breathing_audio_level);
    sanitized.breathing_audio_level = Number.isFinite(numericLevel)
      ? Number(numericLevel.toFixed(2))
      : sanitized.breathing_audio_level;
  }

  return sanitized;
}

function extractInsertedId(insertResult) {
  if (Array.isArray(insertResult)) {
    const first = insertResult[0];
    if (typeof first === 'object' && first !== null) {
      return first.id;
    }
    return first;
  }

  if (typeof insertResult === 'object' && insertResult !== null) {
    return insertResult.id;
  }

  return insertResult;
}

// User model
const User = {
  getAll: async () => {
    const safeUserColumns = await getSafeUserColumns();
    return db('users').select(safeUserColumns);
  },
  
  getById: async (id) => {
    const safeUserColumns = await getSafeUserColumns();
    return db('users').select(safeUserColumns).where('id', id).first();
  },

  getByEmail: async (email) => {
    const safeUserColumns = await getSafeUserColumns();
    return db('users').select(safeUserColumns).where('email', email).first();
  },

  getByEmailWithSecret: async (email) => {
    return db('users').where('email', email).first();
  },

  getByIdWithSecret: async (id) => {
    return db('users').where('id', id).first();
  },
  
  create: async (userData) => {
    const safeUserColumns = await getSafeUserColumns();
    const sanitizedUserData = await sanitizeUserDataForSchema(userData);
    const insertResult = await db('users').insert(sanitizedUserData).returning('id');
    const id = extractInsertedId(insertResult);
    return db('users').select(safeUserColumns).where('id', id).first();
  },
  
  update: async (id, userData) => {
    const safeUserColumns = await getSafeUserColumns();
    const sanitizedUserData = await sanitizeUserDataForSchema(userData);
    await db('users').where('id', id).update(sanitizedUserData);
    return db('users').select(safeUserColumns).where('id', id).first();
  },

  updatePasswordHash: async (id, passwordHash) => {
    await db('users').where('id', id).update({
      password_hash: passwordHash
    });
  },
  
  delete: async (id) => {
    return db('users').where('id', id).del();
  }
};

const BreathingProfile = {
  getAllForUser: async (userId) => {
    return db('breathing_profiles')
      .where('user_id', userId)
      .orderBy('created_at', 'desc');
  },

  getByIdForUser: async (userId, profileId) => {
    return db('breathing_profiles')
      .where({ user_id: userId, id: profileId })
      .first();
  },

  create: async (profileData) => {
    const insertResult = await db('breathing_profiles').insert(profileData).returning('id');
    const id = extractInsertedId(insertResult);
    return db('breathing_profiles').where('id', id).first();
  },

  updateForUser: async (userId, profileId, profileData) => {
    await db('breathing_profiles')
      .where({ user_id: userId, id: profileId })
      .update(profileData);

    return db('breathing_profiles')
      .where({ user_id: userId, id: profileId })
      .first();
  },

  deleteForUser: async (userId, profileId) => {
    return db('breathing_profiles')
      .where({ user_id: userId, id: profileId })
      .del();
  }
};

// Mood Entry model
const MoodEntry = {
  getAll: async (userId) => {
    return db('mood_entries').where('user_id', userId).orderBy('date', 'desc');
  },
  
  getById: async (id) => {
    return db('mood_entries').where('id', id).first();
  },
  
  getByDate: async (userId, date) => {
    return db('mood_entries').where('user_id', userId).where('date', date).first();
  },
  
  getRecent: async (userId, limit) => {
    return db('mood_entries').where('user_id', userId).orderBy('date', 'desc').limit(limit);
  },
  
  create: async (entryData) => {
    const insertResult = await db('mood_entries').insert(entryData).returning('id');
    const id = extractInsertedId(insertResult);
    return db('mood_entries').where('id', id).first();
  },
  
  update: async (id, entryData) => {
    await db('mood_entries').where('id', id).update(entryData);
    return db('mood_entries').where('id', id).first();
  },
  
  delete: async (id) => {
    return db('mood_entries').where('id', id).del();
  },
  
  getAverageCurrentWeek: async (userId) => {
    const results = await db('mood_entries')
      .where('user_id', userId)
      .orderBy('date', 'desc')
      .limit(5);
    
    if (!results.length) {
      return {
        mood: 0,
        sleep: 0,
        water_oz: 0,
        weight_lbs: 0,
        entryCount: 0,
        sleepEntryCount: 0,
        waterEntryCount: 0,
        weightEntryCount: 0
      };
    }
    
    const moodAvg = results.reduce((sum, r) => sum + r.mood, 0) / results.length;
    const sleepResults = results.filter((r) => r.sleep !== null && r.sleep !== undefined);
    const sleepAvg = sleepResults.length
      ? sleepResults.reduce((sum, r) => sum + Number(r.sleep), 0) / sleepResults.length
      : 0;

    const waterResults = results.filter((r) => r.water_oz !== null && r.water_oz !== undefined);
    const waterAvg = waterResults.length
      ? waterResults.reduce((sum, r) => sum + Number(r.water_oz), 0) / waterResults.length
      : 0;

    const weightResults = results.filter((r) => r.weight_lbs !== null && r.weight_lbs !== undefined);
    const weightAvg = weightResults.length
      ? weightResults.reduce((sum, r) => sum + Number(r.weight_lbs), 0) / weightResults.length
      : 0;
    
    return {
      mood: moodAvg.toFixed(2),
      sleep: sleepAvg.toFixed(2),
      water_oz: waterAvg.toFixed(2),
      weight_lbs: weightAvg.toFixed(2),
      entryCount: results.length,
      sleepEntryCount: sleepResults.length,
      waterEntryCount: waterResults.length,
      weightEntryCount: weightResults.length
    };
  },
  
  getAveragePreviousWeek: async (userId) => {
    const results = await db('mood_entries')
      .where('user_id', userId)
      .orderBy('date', 'desc')
      .offset(5)
      .limit(5);
    
    if (!results.length) {
      return {
        mood: 0,
        sleep: 0,
        water_oz: 0,
        weight_lbs: 0,
        entryCount: 0,
        sleepEntryCount: 0,
        waterEntryCount: 0,
        weightEntryCount: 0
      };
    }
    
    const moodAvg = results.reduce((sum, r) => sum + r.mood, 0) / results.length;
    const sleepResults = results.filter((r) => r.sleep !== null && r.sleep !== undefined);
    const sleepAvg = sleepResults.length
      ? sleepResults.reduce((sum, r) => sum + Number(r.sleep), 0) / sleepResults.length
      : 0;

    const waterResults = results.filter((r) => r.water_oz !== null && r.water_oz !== undefined);
    const waterAvg = waterResults.length
      ? waterResults.reduce((sum, r) => sum + Number(r.water_oz), 0) / waterResults.length
      : 0;

    const weightResults = results.filter((r) => r.weight_lbs !== null && r.weight_lbs !== undefined);
    const weightAvg = weightResults.length
      ? weightResults.reduce((sum, r) => sum + Number(r.weight_lbs), 0) / weightResults.length
      : 0;
    
    return {
      mood: moodAvg.toFixed(2),
      sleep: sleepAvg.toFixed(2),
      water_oz: waterAvg.toFixed(2),
      weight_lbs: weightAvg.toFixed(2),
      entryCount: results.length,
      sleepEntryCount: sleepResults.length,
      waterEntryCount: waterResults.length,
      weightEntryCount: weightResults.length
    };
  }
};

module.exports = { db, User, BreathingProfile, MoodEntry };
