const request = require('supertest');
const mongoose = require('mongoose');
const http = require('http');
const Client = require('socket.io-client');
const dbHandler = require('./db');
const app = require('../src/app');
const { User, Captain, Ride } = require('../src/models');
const { initSocket } = require('../src/socket');

describe('Chat Feature (TDD)', () => {
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
      .send({ first_name: 'Rider', last_name: 'Chat', email: 'rider@chat.com', password: 'pwd' });
    riderToken = riderRes.body.token;
    riderId = riderRes.body.user._id;

    const captainRes = await request(app)
      .post('/auth/captain/signup')
      .send({
        full_name: 'Captain Chat',
        phone_number: '1234',
        vehicle_type: 'car',
        plate_number: 'CHAT-1',
        capacity: 4,
        vehicle_color: 'Black',
        terms_accepted: true,
        email: 'captain@chat.com',
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

    // Accept ride so captain is linked
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

  it('should send a message via POST /rides/:id/messages and broadcast via Socket', async () => {
    const chatPromise = new Promise((resolve) => {
      captainSocket.on('new_message', (data) => {
        resolve(data);
      });
    });

    const res = await request(app)
      .post(`/rides/${rideId}/messages`)
      .set('Authorization', `Bearer ${riderToken}`)
      .send({ text: 'Where are you right now?' });

    expect(res.status).toBe(201);
    expect(res.body.message).toBeDefined();
    expect(res.body.message.text).toBe('Where are you right now?');
    expect(res.body.message.sender_role).toBe('rider');

    const socketPayload = await chatPromise;
    expect(socketPayload.text).toBe('Where are you right now?');
    expect(socketPayload.sender_role).toBe('rider');
  });

  it('should retrieve message history via GET /rides/:id/messages', async () => {
    // Send 2 messages
    await request(app)
      .post(`/rides/${rideId}/messages`)
      .set('Authorization', `Bearer ${riderToken}`)
      .send({ text: 'Msg 1' });

    await request(app)
      .post(`/rides/${rideId}/messages`)
      .set('Authorization', `Bearer ${captainToken}`)
      .send({ text: 'Msg 2' });

    const res = await request(app)
      .get(`/rides/${rideId}/messages`)
      .set('Authorization', `Bearer ${riderToken}`)
      .send();

    expect(res.status).toBe(200);
    expect(res.body.messages.length).toBe(2);
    expect(res.body.messages[0].text).toBe('Msg 1');
    expect(res.body.messages[1].text).toBe('Msg 2');
  });

  it('should reject message operations for unauthorized riders/captains', async () => {
    // Create an unrelated User
    const unrelatedUserRes = await request(app)
      .post('/auth/signup')
      .send({ first_name: 'Unrelated', last_name: 'User', email: 'unrelated@chat.com', password: 'pwd' });
    const unrelatedToken = unrelatedUserRes.body.token;

    // POST should fail
    const postRes = await request(app)
      .post(`/rides/${rideId}/messages`)
      .set('Authorization', `Bearer ${unrelatedToken}`)
      .send({ text: 'Spy Message' });
    expect(postRes.status).toBe(403);

    // GET should fail
    const getRes = await request(app)
      .get(`/rides/${rideId}/messages`)
      .set('Authorization', `Bearer ${unrelatedToken}`)
      .send();
    expect(getRes.status).toBe(403);
  });
});
