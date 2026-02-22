const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const connectDB = require('./config/db');
const { startNotificationScheduler } = require('./services/notificationScheduler');
const { startRecurringTaskScheduler } = require('./services/recurringTaskService');

const app = express();

// Connect to Database
connectDB();

// Start schedulers
startNotificationScheduler();
startRecurringTaskScheduler();

// Middleware
app.use(cors());
app.use(express.json());

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Test Route
app.get('/api', (req, res) => {
  res.json({ message: 'Welcome to Task Management API' });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/items', require('./routes/items'));
app.use('/api/workspaces', require('./routes/workspaces')); // ← Team collaboration

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});