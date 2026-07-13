const mongoose = require('mongoose');
const dbHandler = require('./db');
const { User, Captain, Ride, Message, TokenBlacklist } = require('../src/models');

describe('Database Schemas (TDD)', () => {
  beforeAll(async () => {
    await dbHandler.connect();
  });

  afterEach(async () => {
    await dbHandler.clear();
  });

  afterAll(async () => {
    await dbHandler.close();
  });

  describe('User (Rider) Schema', () => {
    it('should create a valid user', async () => {
      const userData = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        password: 'password123',
        rating: 4.8,
        refresh_token: 'dummy_refresh'
      };
      const user = new User(userData);
      const savedUser = await user.save();
      expect(savedUser._id).toBeDefined();
      expect(savedUser.first_name).toBe(userData.first_name);
      expect(savedUser.rating).toBe(4.8);
    });

    it('should fail if required fields are missing', async () => {
      const user = new User({ first_name: 'OnlyFirst' });
      let err;
      try {
        await user.save();
      } catch (error) {
        err = error;
      }
      expect(err).toBeDefined();
      expect(err.errors.email).toBeDefined();
    });
  });

  describe('Captain Schema', () => {
    it('should create a valid captain with GeoJSON location', async () => {
      const captainData = {
        full_name: 'Captain Jack',
        phone_number: '+1234567890',
        vehicle_type: 'car',
        plate_number: 'XYZ-999',
        capacity: 4,
        vehicle_color: 'Black',
        terms_accepted: true,
        is_online: true,
        email: 'jack@captain.com',
        password: 'pwd',
        location: {
          type: 'Point',
          coordinates: [-73.935242, 40.730610] // longitude, latitude
        },
        rating: 4.9
      };
      const captain = new Captain(captainData);
      const saved = await captain.save();
      expect(saved._id).toBeDefined();
      expect(saved.location.coordinates[0]).toBe(-73.935242);
      expect(saved.capacity).toBe(4);
    });

    it('should reject invalid vehicle_type enum', async () => {
      const captain = new Captain({
        full_name: 'Bad Enum',
        phone_number: '123',
        vehicle_type: 'airplane', // invalid
        plate_number: 'ABC-123',
        capacity: 2,
        vehicle_color: 'Red',
        terms_accepted: true,
        email: 'bad@captain.com',
        password: 'pwd'
      });
      let err;
      try {
        await captain.save();
      } catch (error) {
        err = error;
      }
      expect(err).toBeDefined();
      expect(err.errors.vehicle_type).toBeDefined();
    });
  });

  describe('Ride Schema', () => {
    it('should create a valid ride with nested stops and fare breakdown', async () => {
      const rider = new User({
        first_name: 'Rider',
        last_name: 'Test',
        email: 'rider@test.com',
        password: 'pass'
      });
      await rider.save();

      const captain = new Captain({
        full_name: 'Captain Test',
        phone_number: '111',
        vehicle_type: 'bike',
        plate_number: 'BIKE-1',
        capacity: 1,
        vehicle_color: 'Blue',
        terms_accepted: true,
        email: 'captain@test.com',
        password: 'pwd'
      });
      await captain.save();

      const rideData = {
        rider: rider._id,
        captain: captain._id,
        pickup_address: 'Start Point',
        pickup_coordinates: { type: 'Point', coordinates: [-73.935, 40.73] },
        destination_address: 'End Point',
        destination_coordinates: { type: 'Point', coordinates: [-73.94, 40.74] },
        stops: [
          { address: 'Stop 1', coordinates: { type: 'Point', coordinates: [-73.937, 40.735] } }
        ],
        vehicle_type: 'bike',
        fare: {
          base_fare: 5.00,
          distance_fare: 10.00,
          time_fare: 3.00,
          taxes_fees: 0.90,
          total: 18.90
        },
        otp_code: '1234',
        status: 'requested',
        timestamps: {
          requestedAt: new Date()
        }
      };

      const ride = new Ride(rideData);
      const saved = await ride.save();
      expect(saved._id).toBeDefined();
      expect(saved.stops.length).toBe(1);
      expect(saved.fare.total).toBe(18.90);
      expect(saved.status).toBe('requested');
    });

    it('should reject invalid status enum', async () => {
      const ride = new Ride({
        rider: new mongoose.Types.ObjectId(),
        status: 'invalid_status_enum'
      });
      let err;
      try {
        await ride.save();
      } catch (error) {
        err = error;
      }
      expect(err).toBeDefined();
      expect(err.errors.status).toBeDefined();
    });
  });

  describe('Message Schema', () => {
    it('should create a valid message', async () => {
      const messageData = {
        ride_id: new mongoose.Types.ObjectId(),
        sender_role: 'rider',
        sender_id: new mongoose.Types.ObjectId().toString(),
        text: 'Hello, where are you?',
        timestamp: new Date()
      };
      const message = new Message(messageData);
      const saved = await message.save();
      expect(saved._id).toBeDefined();
      expect(saved.text).toBe(messageData.text);
    });
  });

  describe('TokenBlacklist Schema', () => {
    it('should create a blacklisted token', async () => {
      const blacklistData = {
        token: 'invalidated_jwt_token_here',
        expiry: new Date(Date.now() + 3600 * 1000)
      };
      const blacklisted = new TokenBlacklist(blacklistData);
      const saved = await blacklisted.save();
      expect(saved._id).toBeDefined();
    });
  });
});
