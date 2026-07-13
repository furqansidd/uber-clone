const express = require('express');
const authRoutes = require('./routes/auth');
const captainRoutes = require('./routes/captains');
const rideRoutes = require('./routes/rides');

const app = express();

app.use(express.json());

// Enable CORS for frontend client communication
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use('/auth', authRoutes);
app.use('/captains', captainRoutes);
app.use('/rides', rideRoutes);

// General 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

module.exports = app;
