require('dotenv').config();
const http = require('http');
const mongoose = require('mongoose');
const dns = require('dns');
const app = require('./app');
const { initSocket } = require('./socket');

// Apply DNS override in non-production environments to resolve Atlas SRV records correctly
if (process.env.NODE_ENV !== 'production') {
  try {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
    console.log('Applied dev DNS server override (8.8.8.8 / 1.1.1.1)');
  } catch (e) {
    console.warn('Dev DNS server override failed to apply:', e.message);
  }
}

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/drivenow';

const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

// Connect to MongoDB and start server
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB successfully.');
    server.listen(PORT, () => {
      console.log(`SwiftRide backend server is listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Database connection failed:', err);
    process.exit(1);
  });
