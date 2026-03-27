const knex = require('knex');
const config = require('../knexfile');

const db = knex(config[process.env.NODE_ENV || 'development']);
const baseSafeUserColumns = ['id', 'name', 'email', 'avatar', 'created_at', 'updated_at'];
let hasThemePreferenceColumnCache;

async function hasThemePreferenceColumn() {
  if (hasThemePreferenceColumnCache === true) {
    return hasThemePreferenceColumnCache;
  }

  try {
    const hasColumn = await db.schema.hasColumn('users', 'theme_preference');
    hasThemePreferenceColumnCache = hasColumn ? true : undefined;
    return hasColumn;
  } catch (error) {
    return false;
  }
}

async function getSafeUserColumns() {
  const safeUserColumns = [...baseSafeUserColumns];

  if (await hasThemePreferenceColumn()) {
    safeUserColumns.splice(4, 0, 'theme_preference');
  }

  return safeUserColumns;
}

async function sanitizeUserDataForSchema(userData) {
  const sanitized = { ...userData };

  if (!(await hasThemePreferenceColumn())) {
    delete sanitized.theme_preference;
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
    
    if (!results.length) return { mood: 0, sleep: 0, entryCount: 0, sleepEntryCount: 0 };
    
    const moodAvg = results.reduce((sum, r) => sum + r.mood, 0) / results.length;
    const sleepResults = results.filter((r) => r.sleep !== null && r.sleep !== undefined);
    const sleepAvg = sleepResults.length
      ? sleepResults.reduce((sum, r) => sum + Number(r.sleep), 0) / sleepResults.length
      : 0;
    
    return {
      mood: moodAvg.toFixed(2),
      sleep: sleepAvg.toFixed(2),
      entryCount: results.length,
      sleepEntryCount: sleepResults.length
    };
  },
  
  getAveragePreviousWeek: async (userId) => {
    const results = await db('mood_entries')
      .where('user_id', userId)
      .orderBy('date', 'desc')
      .offset(5)
      .limit(5);
    
    if (!results.length) return { mood: 0, sleep: 0, entryCount: 0, sleepEntryCount: 0 };
    
    const moodAvg = results.reduce((sum, r) => sum + r.mood, 0) / results.length;
    const sleepResults = results.filter((r) => r.sleep !== null && r.sleep !== undefined);
    const sleepAvg = sleepResults.length
      ? sleepResults.reduce((sum, r) => sum + Number(r.sleep), 0) / sleepResults.length
      : 0;
    
    return {
      mood: moodAvg.toFixed(2),
      sleep: sleepAvg.toFixed(2),
      entryCount: results.length,
      sleepEntryCount: sleepResults.length
    };
  }
};

module.exports = { db, User, MoodEntry };
