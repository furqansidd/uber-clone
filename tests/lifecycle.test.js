const request = require('supertest');
const mongoose = require('mongoose');
const http = require('http');
const Client = require('socket.io-client');
const dbHandler = require('./db');
const app = require('../src/app');
const { User, Captain, Ride } = require('../src/models');
const { initSocket } = require('../src/socket');
const { clearAllDispatches } = require('../src/utils/dispatcher');

describe('Ride Lifecycle, OTP, & Stops API (TDD)', () => {
  let server, io, port;
  let riderToken, captainToken, riderId, captainId;
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
      .send({ first_name: 'Rider', last_name: 'L', email: 'rider@life.com', password: 'pwd' });
    riderToken = riderRes.body.token;
    riderId = riderRes.body.user._id;

    const captainRes = await request(app)
      .post('/auth/captain/signup')
      .send({
        full_name: 'Captain L',
        phone_number: '1234',
        vehicle_type: 'car',
        plate_number: 'L-123',
        capacity: 4,
        vehicle_color: 'Red',
        terms_accepted: true,
        email: 'captain@life.com',
        password: 'pwd'
      });
    captainToken = captainRes.body.token;
    captainId = captainRes.body.captain._id;

    // 2. Put Captain online
    await request(app)
      .post('/captains/status')
      .set('Authorization', `Bearer ${captainToken}`)
      .send({ is_online: true, latitude: 40.73, longitude: -73.93 });

    // 3. Connect Sockets
    riderSocket = Client(`http://localhost:${port}`);
    captainSocket = Client(`http://localhost:${port}`);

    await Promise.all([
      new Promise((resolve) => {
        riderSocket.on('connect', () => {
          riderSocket.emit('authenticate', { token: riderToken, role: 'rider' });
        });
        riderSocket.on('authenticated', () => resolve());
      }),
      new Promise((resolve) => {
        captainSocket.on('connect', () => {
          captainSocket.emit('authenticate', { token: captainToken, role: 'captain' });
        });
        captainSocket.on('authenticated', () => resolve());
      })
    ]);
  });

  afterEach(async () => {
    clearAllDispatches();
    if (riderSocket && riderSocket.connected) riderSocket.disconnect();
    if (captainSocket && captainSocket.connected) captainSocket.disconnect();
    await dbHandler.clear();
  });

  afterAll(async () => {
    await new Promise((resolve) => io.close(resolve));
    await new Promise((resolve) => server.close(resolve));
    await dbHandler.close();
  });

  const createRequestedRide = async () => {
    const res = await request(app)
      .post('/rides/request')
      .set('Authorization', `Bearer ${riderToken}`)
      .send({
        pickup_address: 'A',
        pickup_coordinates: { latitude: 40.73, longitude: -73.93 },
        destination_address: 'B',
        destination_coordinates: { latitude: 40.74, longitude: -73.94 },
        vehicle_type: 'car'
      });
    return res.body.ride;
  };

  it('should accept a ride, transition to driver_arriving, and join sockets to ride room', async () => {
    const ride = await createRequestedRide();

    // Rider and Captain subscribe to ride room updates
    riderSocket.emit('join_ride', { ride_id: ride._id });
    captainSocket.emit('join_ride', { ride_id: ride._id });

    // Rider listens for matched broadcast
    const matchedPromise = new Promise((resolve) => {
      riderSocket.on('ride_matched', (data) => resolve(data));
    });

    const res = await request(app)
      .post(`/rides/${ride._id}/accept`)
      .set('Authorization', `Bearer ${captainToken}`)
      .send();

    expect(res.status).toBe(200);
    expect(res.body.ride.status).toBe('driver_arriving');
    expect(res.body.ride.captain).toBe(captainId);

    const broadcast = await matchedPromise;
    expect(broadcast.ride_id).toBe(ride._id);
    expect(broadcast.status).toBe('driver_arriving');
  });

  it('should mark driver arrived manually and transition status to driver_arrived', async () => {
    let ride = await createRequestedRide();
    // Accept first
    await request(app).post(`/rides/${ride._id}/accept`).set('Authorization', `Bearer ${captainToken}`).send();

    riderSocket.emit('join_ride', { ride_id: ride._id });
    const arrivedPromise = new Promise((resolve) => {
      riderSocket.on('ride_arrived', (data) => resolve(data));
    });

    const res = await request(app)
      .post(`/rides/${ride._id}/arrived`)
      .set('Authorization', `Bearer ${captainToken}`)
      .send();

    expect(res.status).toBe(200);
    expect(res.body.ride.status).toBe('driver_arrived');

    const broadcast = await arrivedPromise;
    expect(broadcast.ride_id).toBe(ride._id);
    expect(broadcast.status).toBe('driver_arrived');
  });

  it('should start ride with correct OTP and transition status to ongoing', async () => {
    let ride = await createRequestedRide();
    const correctOtp = ride.otp_code;

    // Accept and Arrive
    await request(app).post(`/rides/${ride._id}/accept`).set('Authorization', `Bearer ${captainToken}`).send();
    await request(app).post(`/rides/${ride._id}/arrived`).set('Authorization', `Bearer ${captainToken}`).send();

    riderSocket.emit('join_ride', { ride_id: ride._id });
    const startedPromise = new Promise((resolve) => {
      riderSocket.on('ride_started', (data) => resolve(data));
    });

    // Mismatch OTP should fail
    const resFail = await request(app)
      .post(`/rides/${ride._id}/start`)
      .set('Authorization', `Bearer ${captainToken}`)
      .send({ otp_code: '0000' });
    expect(resFail.status).toBe(400);

    // Correct OTP should succeed
    const res = await request(app)
      .post(`/rides/${ride._id}/start`)
      .set('Authorization', `Bearer ${captainToken}`)
      .send({ otp_code: correctOtp });

    expect(res.status).toBe(200);
    expect(res.body.ride.status).toBe('ongoing');

    const broadcast = await startedPromise;
    expect(broadcast.ride_id).toBe(ride._id);
    expect(broadcast.status).toBe('ongoing');
  });

  it('should complete a ride and transition status to completed', async () => {
    let ride = await createRequestedRide();
    await request(app).post(`/rides/${ride._id}/accept`).set('Authorization', `Bearer ${captainToken}`).send();
    await request(app).post(`/rides/${ride._id}/arrived`).set('Authorization', `Bearer ${captainToken}`).send();
    await request(app).post(`/rides/${ride._id}/start`).set('Authorization', `Bearer ${captainToken}`).send({ otp_code: ride.otp_code });

    riderSocket.emit('join_ride', { ride_id: ride._id });
    const completedPromise = new Promise((resolve) => {
      riderSocket.on('ride_completed', (data) => resolve(data));
    });

    const res = await request(app)
      .post(`/rides/${ride._id}/complete`)
      .set('Authorization', `Bearer ${captainToken}`)
      .send();

    expect(res.status).toBe(200);
    expect(res.body.ride.status).toBe('completed');

    const broadcast = await completedPromise;
    expect(broadcast.ride_id).toBe(ride._id);
  });

  it('should cancel a ride (Rider cancellation) and emit ride_cancelled', async () => {
    let ride = await createRequestedRide();

    riderSocket.emit('join_ride', { ride_id: ride._id });
    const cancelledPromise = new Promise((resolve) => {
      riderSocket.on('ride_cancelled', (data) => resolve(data));
    });

    const res = await request(app)
      .delete(`/rides/${ride._id}`)
      .set('Authorization', `Bearer ${riderToken}`)
      .send();

    expect(res.status).toBe(200);
    expect(res.body.ride.status).toBe('cancelled_by_rider');

    const broadcast = await cancelledPromise;
    expect(broadcast.status).toBe('cancelled_by_rider');
  });

  it('should insert a stop, recalculate fare, and broadcast ride_updated', async () => {
    let ride = await createRequestedRide();
    await request(app).post(`/rides/${ride._id}/accept`).set('Authorization', `Bearer ${captainToken}`).send();

    riderSocket.emit('join_ride', { ride_id: ride._id });
    const updatedPromise = new Promise((resolve) => {
      riderSocket.on('ride_updated', (data) => resolve(data));
    });

    const res = await request(app)
      .post(`/rides/${ride._id}/stops`)
      .set('Authorization', `Bearer ${riderToken}`)
      .send({
        address: 'Stop 1 Address',
        coordinates: { latitude: 40.735, longitude: -73.935 }
      });

    expect(res.status).toBe(200);
    expect(res.body.ride.stops.length).toBe(1);
    expect(res.body.ride.stops[0].address).toBe('Stop 1 Address');
    expect(res.body.ride.fare).toBeDefined();

    const broadcast = await updatedPromise;
    expect(broadcast.stops.length).toBe(1);
    expect(broadcast.stops[0].address).toBe('Stop 1 Address');
  });

  it('should reject Cancel Ride if called by an unauthorized rider or captain', async () => {
    let ride = await createRequestedRide();

    // Create an unrelated user
    const otherUserRes = await request(app)
      .post('/auth/signup')
      .send({ first_name: 'Other', last_name: 'User', email: 'other@user.com', password: 'pwd' });
    const otherToken = otherUserRes.body.token;

    // Try to cancel the ride using otherToken (should fail with 403)
    const res = await request(app)
      .delete(`/rides/${ride._id}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send();

    expect(res.status).toBe(403);
  });

  it('should reject lifecycle operations if called by unauthorized captains or riders', async () => {
    // 1. Create an unrelated captain
    const otherCapRes = await request(app)
      .post('/auth/captain/signup')
      .send({
        full_name: 'Other Cap',
        phone_number: '9876',
        vehicle_type: 'car',
        plate_number: 'XYZ-789',
        capacity: 4,
        vehicle_color: 'Blue',
        terms_accepted: true,
        email: 'othercap@life.com',
        password: 'pwd'
      });
    const otherCapToken = otherCapRes.body.token;

    // 2. Create an unrelated rider
    const otherRiderRes = await request(app)
      .post('/auth/signup')
      .send({ first_name: 'OtherR', last_name: 'L', email: 'otherrider@life.com', password: 'pwd' });
    const otherRiderToken = otherRiderRes.body.token;

    // Create a requested ride (offered to the nearest captain, i.e., captainToken)
    let ride = await createRequestedRide();

    // -- Test accept/decline: otherCapToken should be rejected since they are not the candidate offered the ride
    const acceptRes = await request(app)
      .post(`/rides/${ride._id}/accept`)
      .set('Authorization', `Bearer ${otherCapToken}`)
      .send();
    expect(acceptRes.status).toBe(403);

    const declineRes = await request(app)
      .post(`/rides/${ride._id}/decline`)
      .set('Authorization', `Bearer ${otherCapToken}`)
      .send();
    expect(declineRes.status).toBe(403);

    // -- Test arrived/start/complete: accept ride with the correct captain first
    await request(app).post(`/rides/${ride._id}/accept`).set('Authorization', `Bearer ${captainToken}`).send();

    // Now otherCapToken tries to call arrived (should fail with 403)
    const arrivedRes = await request(app)
      .post(`/rides/${ride._id}/arrived`)
      .set('Authorization', `Bearer ${otherCapToken}`)
      .send();
    expect(arrivedRes.status).toBe(403);

    // Transition to arrived via correct captain
    await request(app).post(`/rides/${ride._id}/arrived`).set('Authorization', `Bearer ${captainToken}`).send();

    // Now otherCapToken tries to call start (should fail with 403)
    const startRes = await request(app)
      .post(`/rides/${ride._id}/start`)
      .set('Authorization', `Bearer ${otherCapToken}`)
      .send({ otp_code: ride.otp_code });
    expect(startRes.status).toBe(403);

    // Transition to start via correct captain
    await request(app).post(`/rides/${ride._id}/start`).set('Authorization', `Bearer ${captainToken}`).send({ otp_code: ride.otp_code });

    // Now otherCapToken tries to call complete (should fail with 403)
    const completeRes = await request(app)
      .post(`/rides/${ride._id}/complete`)
      .set('Authorization', `Bearer ${otherCapToken}`)
      .send();
    expect(completeRes.status).toBe(403);

    // -- Test addStop: otherRiderToken tries to add stop (should fail with 403)
    const stopRes = await request(app)
      .post(`/rides/${ride._id}/stops`)
      .set('Authorization', `Bearer ${otherRiderToken}`)
      .send({
        address: 'Intruder Stop',
        coordinates: { latitude: 40.75, longitude: -73.95 }
      });
    expect(stopRes.status).toBe(403);
  });
});
