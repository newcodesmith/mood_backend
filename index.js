require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const moodEntryRoutes = require('./routes/moodEntries');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/mood-entries', moodEntryRoutes);

// Friendly root route for local development.
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Health Tracker API is running.',
    frontend: 'http://localhost:3000',
    health: '/api/health'
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Health Tracker API running on http://localhost:${PORT}`);
});
