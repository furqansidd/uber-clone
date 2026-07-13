const request = require('supertest');
const mongoose = require('mongoose');
const http = require('http');
const Client = require('socket.io-client');
const dbHandler = require('./db');
const app = require('../src/app');
const { User, Captain, Ride } = require('../src/models');
const { initSocket } = require('../src/socket');

describe('Real-Time Location Streaming (TDD)', () => {
  let server, io, port;
  let riderToken, captainToken, riderId, captainId, rideId;
  let riderSocket, captainSocket;

  beforeAll(async () => {
    await dbHandler.connect();
    server = http.createServer(app);
    io = initSocket(server);

    await new Promise((resolve) => {
      server.listen(0, () => {
        port = server.address().port;
        resolve();
      });
    });
  });

  beforeEach(async () => {
    // 1. Create rider and captain
    const riderRes = await request(app)
      .post('/auth/signup')
      .send({ first_name: 'Rider', last_name: 'Loc', email: 'rider@loc.com', password: 'pwd' });
    riderToken = riderRes.body.token;
    riderId = riderRes.body.user._id;

    const captainRes = await request(app)
      .post('/auth/captain/signup')
      .send({
        full_name: 'Captain Loc',
        phone_number: '1234',
        vehicle_type: 'car',
        plate_number: 'LOC-1',
        capacity: 4,
        vehicle_color: 'Yellow',
        terms_accepted: true,
        email: 'captain@loc.com',
        password: 'pwd'
      });
    captainToken = captainRes.body.token;
    captainId = captainRes.body.captain._id;

    // 2. Put Captain online and create ride
    await request(app)
      .post('/captains/status')
      .set('Authorization', `Bearer ${captainToken}`)
      .send({ is_online: true, latitude: 40.73, longitude: -73.93 });

    const rideRes = await request(app)
      .post('/rides/request')
      .set('Authorization', `Bearer ${riderToken}`)
      .send({
        pickup_address: 'A',
        pickup_coordinates: { latitude: 40.73, longitude: -73.93 },
        destination_address: 'B',
        destination_coordinates: { latitude: 40.74, longitude: -73.94 },
        vehicle_type: 'car'
      });
    rideId = rideRes.body.ride._id;

    // Accept ride
    await request(app)
      .post(`/rides/${rideId}/accept`)
      .set('Authorization', `Bearer ${captainToken}`)
      .send();

    // 3. Connect Sockets
    riderSocket = Client(`http://localhost:${port}`);
    captainSocket = Client(`http://localhost:${port}`);

    await Promise.all([
      new Promise((resolve) => {
        riderSocket.on('connect', () => {
          riderSocket.emit('authenticate', { token: riderToken, role: 'rider' });
        });
        riderSocket.on('authenticated', () => {
          riderSocket.emit('join_ride', { ride_id: rideId });
          resolve();
        });
      }),
      new Promise((resolve) => {
        captainSocket.on('connect', () => {
          captainSocket.emit('authenticate', { token: captainToken, role: 'captain' });
        });
        captainSocket.on('authenticated', () => {
          captainSocket.emit('join_ride', { ride_id: rideId });
          resolve();
        });
      })
    ]);
  });

  afterEach(async () => {
    if (riderSocket && riderSocket.connected) riderSocket.disconnect();
    if (captainSocket && captainSocket.connected) captainSocket.disconnect();
    await dbHandler.clear();
  });

  afterAll(async () => {
    await new Promise((resolve) => io.close(resolve));
    await new Promise((resolve) => server.close(resolve));
    await dbHandler.close();
  });

  it('should stream Captain location update and update DB & broadcast to Rider', async () => {
    const streamPromise = new Promise((resolve) => {
      riderSocket.on('driver_location_update', (data) => {
        resolve(data);
      });
    });

    // Captain emits location update via socket
    captainSocket.emit('captain_location_update', {
      ride_id: rideId,
      latitude: 40.758896,
      longitude: -73.985130
    });

    // 1. Verify Rider socket receives driver_location_update
    const broadcast = await streamPromise;
    expect(broadcast.ride_id).toBe(rideId);
    expect(broadcast.latitude).toBe(40.758896);
    expect(broadcast.longitude).toBe(-73.985130);

    // 2. Verify Captain coordinates in database are updated
    const updatedCaptain = await Captain.findById(captainId);
    expect(updatedCaptain.location.coordinates[0]).toBe(-73.985130);
    expect(updatedCaptain.location.coordinates[1]).toBe(40.758896);
  });
});
