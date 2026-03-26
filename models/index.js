const knex = require('knex');
const config = require('../knexfile');

const db = knex(config[process.env.NODE_ENV || 'development']);
const safeUserColumns = ['id', 'name', 'email', 'avatar', 'created_at', 'updated_at'];

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
    return db('users').select(safeUserColumns);
  },
  
  getById: async (id) => {
    return db('users').select(safeUserColumns).where('id', id).first();
  },

  getByEmail: async (email) => {
    return db('users').select(safeUserColumns).where('email', email).first();
  },

  getByEmailWithSecret: async (email) => {
    return db('users').where('email', email).first();
  },
  
  create: async (userData) => {
    const insertResult = await db('users').insert(userData).returning('id');
    const id = extractInsertedId(insertResult);
    return db('users').select(safeUserColumns).where('id', id).first();
  },
  
  update: async (id, userData) => {
    await db('users').where('id', id).update(userData);
    return db('users').select(safeUserColumns).where('id', id).first();
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
    
    if (!results.length) return { mood: 0, sleep: 0 };
    
    const moodAvg = results.reduce((sum, r) => sum + r.mood, 0) / results.length;
    const sleepAvg = results.reduce((sum, r) => sum + (r.sleep || 0), 0) / results.length;
    
    return { mood: moodAvg.toFixed(2), sleep: sleepAvg.toFixed(2) };
  },
  
  getAveragePreviousWeek: async (userId) => {
    const results = await db('mood_entries')
      .where('user_id', userId)
      .orderBy('date', 'desc')
      .offset(5)
      .limit(5);
    
    if (!results.length) return { mood: 0, sleep: 0 };
    
    const moodAvg = results.reduce((sum, r) => sum + r.mood, 0) / results.length;
    const sleepAvg = results.reduce((sum, r) => sum + (r.sleep || 0), 0) / results.length;
    
    return { mood: moodAvg.toFixed(2), sleep: sleepAvg.toFixed(2) };
  }
};

module.exports = { db, User, MoodEntry };
