const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const passport = require('./config/passport');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const conversationRoutes = require('./routes/conversationRoutes');

function createApp() {
  const app = express();

  app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true }));
  app.use(express.json());
  app.use(passport.initialize());
  app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

  app.get('/health', (req, res) => res.json({ status: 'ok' }));

  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/conversations', conversationRoutes);

  app.use((req, res) => {
    res.status(404).json({ message: 'Not found' });
  });

  app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError || err?.message === 'Unsupported file type') {
      return res.status(400).json({ message: err.message });
    }
    console.error(err);
    res.status(err.status || 500).json({ message: err.message || 'Server error' });
  });

  return app;
}

module.exports = createApp;
