// app.js - Export app WITHOUT starting the server (needed for Supertest)
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api', (req, res) => {
  res.json({ message: 'Welcome to Task Management API' });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/items', require('./routes/items'));
app.use('/api/workspaces', require('./routes/workspaces'));

module.exports = app;