const request = require('supertest');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');
const Client = require('socket.io-client');
const dbHandler = require('./db');
const app = require('../src/app');
const { User, Captain, Ride } = require('../src/models');
const { initSocket } = require('../src/socket');
const { clearAllDispatches } = require('../src/utils/dispatcher');

describe('Dispatch System & Ride Requests (TDD)', () => {
  let server, io, port;
  let riderToken, captainToken, riderId, captainId;
  let captainSocketClient;

  beforeAll(async () => {
    await dbHandler.connect();

    // Start HTTP and Socket.io server on dynamic port
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
    // Create a Rider
    const riderRes = await request(app)
      .post('/auth/signup')
      .send({
        first_name: 'Rider',
        last_name: 'One',
        email: 'rider1@test.com',
        password: 'password123'
      });
    riderToken = riderRes.body.token;
    riderId = riderRes.body.user._id;

    // Create a Captain
    const captainRes = await request(app)
      .post('/auth/captain/signup')
      .send({
        full_name: 'Captain One',
        phone_number: '+111111',
        vehicle_type: 'car',
        plate_number: 'CAR-111',
        capacity: 4,
        vehicle_color: 'Black',
        terms_accepted: true,
        email: 'captain1@test.com',
        password: 'password123'
      });
    captainToken = captainRes.body.token;
    captainId = captainRes.body.captain._id;
  });

  afterEach(async () => {
    clearAllDispatches();
    if (captainSocketClient && captainSocketClient.connected) {
      captainSocketClient.disconnect();
    }
    await dbHandler.clear();
  });

  afterAll(async () => {
    await new Promise((resolve) => io.close(resolve));
    await new Promise((resolve) => server.close(resolve));
    await dbHandler.close();
  });

  it('should toggle Captain online status and update location', async () => {
    // Check initial status
    let captain = await Captain.findById(captainId);
    expect(captain.is_online).toBe(false);

    // Turn online
    const res = await request(app)
      .post('/captains/status')
      .set('Authorization', `Bearer ${captainToken}`)
      .send({
        is_online: true,
        latitude: 40.730610,
        longitude: -73.935242
      });

    expect(res.status).toBe(200);
    expect(res.body.captain.is_online).toBe(true);
    expect(res.body.captain.location.coordinates[0]).toBe(-73.935242);
    expect(res.body.captain.location.coordinates[1]).toBe(40.730610);
  });

  it('should request a ride and emit a ride offer to the nearest captain', async () => {
    // 1. Put Captain online at location
    await request(app)
      .post('/captains/status')
      .set('Authorization', `Bearer ${captainToken}`)
      .send({
        is_online: true,
        latitude: 40.730610,
        longitude: -73.935242
      });

    // 2. Connect Captain client socket
    captainSocketClient = Client(`http://localhost:${port}`);
    
    await new Promise((resolve) => {
      captainSocketClient.on('connect', () => {
        // Auth/Authenticate socket connection
        captainSocketClient.emit('authenticate', { token: captainToken, role: 'captain' });
      });
      captainSocketClient.on('authenticated', () => {
        resolve();
      });
    });

    // 3. Request a ride as Rider (pickup within 2km of Captain)
    const ridePromise = new Promise((resolve) => {
      captainSocketClient.on('ride_offer', (data) => {
        resolve(data);
      });
    });

    const rideRes = await request(app)
      .post('/rides/request')
      .set('Authorization', `Bearer ${riderToken}`)
      .send({
        pickup_address: 'Central Park',
        pickup_coordinates: { latitude: 40.730615, longitude: -73.935248 },
        destination_address: 'Times Square',
        destination_coordinates: { latitude: 40.758896, longitude: -73.985130 },
        vehicle_type: 'car'
      });

    expect(rideRes.status).toBe(201);
    expect(rideRes.body.ride).toBeDefined();
    expect(rideRes.body.ride.status).toBe('requested');
    expect(rideRes.body.ride.otp_code).toBeDefined();

    // 4. Wait for the Captain to receive the ride offer via socket
    const offer = await ridePromise;
    expect(offer.ride_id).toBe(rideRes.body.ride._id);
    expect(offer.pickup_address).toBe('Central Park');
  });

  it('should escalate to the next captain when the nearest captain declines', async () => {
    // 1. Create and login Captain Two
    const captainTwoRes = await request(app)
      .post('/auth/captain/signup')
      .send({
        full_name: 'Captain Two',
        phone_number: '+222222',
        vehicle_type: 'car',
        plate_number: 'CAR-222',
        capacity: 4,
        vehicle_color: 'White',
        terms_accepted: true,
        email: 'captain2@test.com',
        password: 'password123'
      });
    const captainTwoToken = captainTwoRes.body.token;
    const captainTwoId = captainTwoRes.body.captain._id;

    // 2. Put Captain One online at (40.730610, -73.935242) -> Closer
    await request(app)
      .post('/captains/status')
      .set('Authorization', `Bearer ${captainToken}`)
      .send({ is_online: true, latitude: 40.730610, longitude: -73.935242 });

    // Put Captain Two online at (40.731610, -73.936242) -> Slightly further
    await request(app)
      .post('/captains/status')
      .set('Authorization', `Bearer ${captainTwoToken}`)
      .send({ is_online: true, latitude: 40.731610, longitude: -73.936242 });

    // 3. Connect both Captain sockets
    const socketOne = Client(`http://localhost:${port}`);
    const socketTwo = Client(`http://localhost:${port}`);

    await Promise.all([
      new Promise((resolve) => {
        socketOne.on('connect', () => socketOne.emit('authenticate', { token: captainToken, role: 'captain' }));
        socketOne.on('authenticated', resolve);
      }),
      new Promise((resolve) => {
        socketTwo.on('connect', () => socketTwo.emit('authenticate', { token: captainTwoToken, role: 'captain' }));
        socketTwo.on('authenticated', resolve);
      })
    ]);

    // 4. Set up listeners
    const offerOnePromise = new Promise((resolve) => {
      socketOne.on('ride_offer', (data) => resolve(data));
    });
    const offerTwoPromise = new Promise((resolve) => {
      socketTwo.on('ride_offer', (data) => resolve(data));
    });

    // 5. Rider requests ride
    const rideRes = await request(app)
      .post('/rides/request')
      .set('Authorization', `Bearer ${riderToken}`)
      .send({
        pickup_address: 'Central Park',
        pickup_coordinates: { latitude: 40.730615, longitude: -73.935248 },
        destination_address: 'Times Square',
        destination_coordinates: { latitude: 40.758896, longitude: -73.985130 },
        vehicle_type: 'car'
      });

    const rideId = rideRes.body.ride._id;

    // 6. Captain One (closer) must receive the offer first
    const offerOne = await offerOnePromise;
    expect(offerOne.ride_id).toBe(rideId);

    // 7. Captain One declines
    await request(app)
      .post(`/rides/${rideId}/decline`)
      .set('Authorization', `Bearer ${captainToken}`)
      .send();

    // 8. Captain Two must now receive the offer!
    const offerTwo = await offerTwoPromise;
    expect(offerTwo.ride_id).toBe(rideId);

    // Cleanup
    socketOne.disconnect();
    socketTwo.disconnect();
  });

  it('should expand search radius and dispatch to captain further away if none nearby', async () => {
    // 1. Put Captain One online at (40.760610, -73.965242) -> ~3.5km away (outside 2km, within 4km)
    await request(app)
      .post('/captains/status')
      .set('Authorization', `Bearer ${captainToken}`)
      .send({ is_online: true, latitude: 40.760610, longitude: -73.965242 });

    // 2. Connect Captain socket
    const socketOne = Client(`http://localhost:${port}`);
    await new Promise((resolve) => {
      socketOne.on('connect', () => socketOne.emit('authenticate', { token: captainToken, role: 'captain' }));
      socketOne.on('authenticated', resolve);
    });

    const offerPromise = new Promise((resolve) => {
      socketOne.on('ride_offer', (data) => resolve(data));
    });

    // 3. Rider requests ride at (40.730615, -73.935248)
    const rideRes = await request(app)
      .post('/rides/request')
      .set('Authorization', `Bearer ${riderToken}`)
      .send({
        pickup_address: 'Central Park',
        pickup_coordinates: { latitude: 40.730615, longitude: -73.935248 },
        destination_address: 'Times Square',
        destination_coordinates: { latitude: 40.758896, longitude: -73.985130 },
        vehicle_type: 'car'
      });

    const rideId = rideRes.body.ride._id;

    // 4. Verify Captain One receives offer after radius expansion (since 3.5km > 2km, but <= 4km)
    const offer = await offerPromise;
    expect(offer.ride_id).toBe(rideId);

    socketOne.disconnect();
  });
});
