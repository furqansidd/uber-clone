const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const dbHandler = require('./db');
const app = require('../src/app');
const { User, Captain } = require('../src/models');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_for_testing_and_dev';

describe('Authentication & Password Reset APIs (TDD)', () => {
  beforeAll(async () => {
    await dbHandler.connect();
  });

  afterEach(async () => {
    await dbHandler.clear();
  });

  afterAll(async () => {
    await dbHandler.close();
  });

  describe('Rider Auth API', () => {
    const signupData = {
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com',
      password: 'password123'
    };

    it('should sign up a new rider successfully', async () => {
      const res = await request(app)
        .post('/auth/signup')
        .send(signupData);

      expect(res.status).toBe(201);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.first_name).toBe('John');
      expect(res.body.user.password).toBeUndefined(); // password should be hidden/hashed
      expect(res.body.token).toBeDefined();

      const userInDb = await User.findOne({ email: signupData.email });
      expect(userInDb).toBeDefined();
      expect(userInDb.password).not.toBe(signupData.password); // should be hashed
    });

    it('should fail to sign up with duplicate email', async () => {
      await request(app).post('/auth/signup').send(signupData);
      const res = await request(app).post('/auth/signup').send(signupData);

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('should login an existing rider and return tokens', async () => {
      await request(app).post('/auth/signup').send(signupData);

      const res = await request(app)
        .post('/auth/login')
        .send({
          email: signupData.email,
          password: signupData.password
        });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.refresh_token).toBeDefined();
    });

    it('should reject login with wrong password', async () => {
      await request(app).post('/auth/signup').send(signupData);

      const res = await request(app)
        .post('/auth/login')
        .send({
          email: signupData.email,
          password: 'wrongpassword'
        });

      expect(res.status).toBe(401);
      expect(res.body.token).toBeUndefined();
    });

    it('should logout and blacklist the token', async () => {
      await request(app).post('/auth/signup').send(signupData);
      const loginRes = await request(app)
        .post('/auth/login')
        .send({
          email: signupData.email,
          password: signupData.password
        });

      const token = loginRes.body.token;

      // Access protected route (e.g. logout)
      const res = await request(app)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .send();

      expect(res.status).toBe(200);

      // Now request again with the blacklisted token
      const resProtected = await request(app)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .send();

      expect(resProtected.status).toBe(401);
    });
  });

  describe('Captain Auth API', () => {
    const captainData = {
      full_name: 'Captain Jack',
      phone_number: '+1234567890',
      vehicle_type: 'car',
      plate_number: 'ABC-123',
      capacity: 4,
      vehicle_color: 'Black',
      terms_accepted: true,
      email: 'jack@captain.com',
      password: 'captainpassword'
    };

    it('should sign up a new captain successfully', async () => {
      const res = await request(app)
        .post('/auth/captain/signup')
        .send(captainData);

      expect(res.status).toBe(201);
      expect(res.body.captain).toBeDefined();
      expect(res.body.captain.capacity).toBe(4);
      expect(res.body.token).toBeDefined();
    });

    it('should login an existing captain', async () => {
      await request(app).post('/auth/captain/signup').send(captainData);

      const res = await request(app)
        .post('/auth/captain/login')
        .send({
          email: captainData.email,
          password: captainData.password
        });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
    });
  });

  describe('Captain Password Recovery Flow (Forget & Reset)', () => {
    const captainData = {
      full_name: 'Reset Jack',
      phone_number: '+999888777',
      vehicle_type: 'bike',
      plate_number: 'RESET-1',
      capacity: 1,
      vehicle_color: 'White',
      terms_accepted: true,
      email: 'reset@captain.com',
      password: 'oldpassword'
    };

    it('should generate reset token and mock email on forgot-password request', async () => {
      await request(app).post('/auth/captain/signup').send(captainData);

      const res = await request(app)
        .post('/auth/captain/forgot-password')
        .send({ email: captainData.email });

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/sent/i);

      // Verify token exists in database
      const captain = await Captain.findOne({ email: captainData.email });
      expect(captain.password_reset_token).toBeDefined();
      expect(captain.reset_token_expiry).toBeDefined();
      expect(captain.reset_token_expiry.getTime()).toBeGreaterThan(Date.now());
    });

    it('should reset password with valid token and expire the token', async () => {
      await request(app).post('/auth/captain/signup').send(captainData);
      await request(app)
        .post('/auth/captain/forgot-password')
        .send({ email: captainData.email });

      const captain = await Captain.findOne({ email: captainData.email });
      const resetToken = captain.password_reset_token;

      const res = await request(app)
        .post('/auth/captain/reset-password')
        .send({
          token: resetToken,
          password: 'newsuperpassword'
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/reset successful/i);

      // Check reset token was cleared (single-use)
      const updatedCaptain = await Captain.findOne({ email: captainData.email });
      expect(updatedCaptain.password_reset_token).toBeNull();

      // Check login works with new password
      const loginRes = await request(app)
        .post('/auth/captain/login')
        .send({
          email: captainData.email,
          password: 'newsuperpassword'
        });
      expect(loginRes.status).toBe(200);
      expect(loginRes.body.token).toBeDefined();
    });

    it('should reject reset password with expired or invalid token', async () => {
      await request(app).post('/auth/captain/signup').send(captainData);
      const res = await request(app)
        .post('/auth/captain/reset-password')
        .send({
          token: 'invalid_or_expired_token',
          password: 'newpassword'
        });

      expect(res.status).toBe(400);
    });

    it('should reject captain signup with invalid capacity (non-positive)', async () => {
      await request(app).post('/auth/captain/signup').send(captainData); // ensure clean
      const badData = { ...captainData, capacity: 0, email: 'badcap1@test.com' };
      const res = await request(app)
        .post('/auth/captain/signup')
        .send(badData);
      expect(res.status).toBe(400);
    });

    it('should reject captain signup with invalid plate format', async () => {
      const badData = { ...captainData, plate_number: 'A', email: 'badcap2@test.com' };
      const res = await request(app)
        .post('/auth/captain/signup')
        .send(badData);
      expect(res.status).toBe(400);
    });
  });
});
