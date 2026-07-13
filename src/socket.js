const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { User, Captain } = require('./models');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_for_testing_and_dev';

let ioInstance = null;

const initSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  ioInstance = io;

  io.on('connection', (socket) => {
    // 1. Auth on connection event (useful for client test flow)
    socket.on('authenticate', async (data) => {
      try {
        const { token, role } = data;
        if (!token) {
          return socket.emit('unauthorized', { error: 'Token missing' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        if (role === 'captain' && decoded.role === 'captain') {
          const captain = await Captain.findById(decoded.id);
          if (captain) {
            socket.captainId = captain._id.toString();
            socket.role = 'captain';
            // Join personal room
            socket.join(`captain_${socket.captainId}`);
            socket.emit('authenticated', { status: 'success' });
          }
        } else if (role === 'rider' && decoded.role === 'rider') {
          const user = await User.findById(decoded.id);
          if (user) {
            socket.riderId = user._id.toString();
            socket.role = 'rider';
            // Join personal room
            socket.join(`rider_${socket.riderId}`);
            socket.emit('authenticated', { status: 'success' });
          }
        } else {
          socket.emit('unauthorized', { error: 'Invalid role or token payload' });
        }
      } catch (err) {
        socket.emit('unauthorized', { error: 'Invalid token' });
      }
    });

    // Handle joining ride rooms manually if needed
    socket.on('join_ride', (data) => {
      const { ride_id } = data;
      if (ride_id) {
        socket.join(`ride_${ride_id}`);
      }
    });

    // Handle real-time location streaming from online captains
    socket.on('captain_location_update', async (data) => {
      try {
        const { ride_id, latitude, longitude } = data;
        
        // 1. Update Captain location in Database
        if (socket.captainId && latitude !== undefined && longitude !== undefined) {
          await Captain.findByIdAndUpdate(socket.captainId, {
            location: {
              type: 'Point',
              coordinates: [Number(longitude), Number(latitude)]
            }
          });
        }

        // 2. Rebroadcast location to the ride room
        if (ride_id) {
          sendToRoom(`ride_${ride_id}`, 'driver_location_update', {
            ride_id,
            latitude,
            longitude
          });
        }
      } catch (err) {
        console.error('Error handling captain location update:', err);
      }
    });

    socket.on('disconnect', () => {
      // Cleanup if necessary
    });
  });

  return io;
};

const getIo = () => {
  if (!ioInstance) {
    throw new Error('Socket.io not initialized');
  }
  return ioInstance;
};

const sendToRoom = (room, event, data) => {
  if (ioInstance) {
    ioInstance.to(room).emit(event, data);
  }
};

module.exports = {
  initSocket,
  getIo,
  sendToRoom
};
