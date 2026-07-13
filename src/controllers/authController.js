const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { User, Captain, TokenBlacklist } = require('../models');
const { sendResetEmail } = require('../utils/mailer');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_for_testing_and_dev';

const signupUser = async (req, res) => {
  try {
    const { first_name, last_name, email, password } = req.body;
    if (!first_name || !last_name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      first_name,
      last_name,
      email,
      password: hashedPassword
    });

    await user.save();

    const token = jwt.sign({ id: user._id, role: 'rider' }, JWT_SECRET, { expiresIn: '15m' });
    const refresh_token = jwt.sign({ id: user._id, role: 'rider' }, JWT_SECRET, { expiresIn: '7d' });

    user.refresh_token = refresh_token;
    await user.save();

    // Do not return password field
    const userResponse = user.toObject();
    delete userResponse.password;

    return res.status(201).json({
      user: userResponse,
      token,
      refresh_token
    });
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: err.message });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user._id, role: 'rider' }, JWT_SECRET, { expiresIn: '15m' });
    const refresh_token = jwt.sign({ id: user._id, role: 'rider' }, JWT_SECRET, { expiresIn: '7d' });

    user.refresh_token = refresh_token;
    await user.save();

    const userResponse = user.toObject();
    delete userResponse.password;

    return res.status(200).json({
      user: userResponse,
      token,
      refresh_token
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

const logoutUser = async (req, res) => {
  try {
    const token = req.token;
    const expiry = req.tokenExpiry;

    // Save token to blacklist
    const blacklist = new TokenBlacklist({ token, expiry });
    await blacklist.save();

    // Clear refresh token in user document
    if (req.user) {
      req.user.refresh_token = null;
      await req.user.save();
    }

    return res.status(200).json({ message: 'Logout successful' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

const signupCaptain = async (req, res) => {
  try {
    const {
      full_name,
      phone_number,
      vehicle_type,
      plate_number,
      capacity,
      vehicle_color,
      terms_accepted,
      email,
      password
    } = req.body;

    if (!full_name || !phone_number || !vehicle_type || !plate_number || capacity === undefined || !vehicle_color || terms_accepted === undefined || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const existing = await Captain.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const captain = new Captain({
      full_name,
      phone_number,
      vehicle_type,
      plate_number,
      capacity: Number(capacity),
      vehicle_color,
      terms_accepted,
      email,
      password: hashedPassword
    });

    await captain.save();

    const token = jwt.sign({ id: captain._id, role: 'captain' }, JWT_SECRET, { expiresIn: '15m' });
    
    // Do not return password field
    const captainResponse = captain.toObject();
    delete captainResponse.password;

    return res.status(201).json({
      captain: captainResponse,
      token
    });
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: err.message });
  }
};

const loginCaptain = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const captain = await Captain.findOne({ email });
    if (!captain) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, captain.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: captain._id, role: 'captain' }, JWT_SECRET, { expiresIn: '15m' });

    const captainResponse = captain.toObject();
    delete captainResponse.password;

    return res.status(200).json({
      captain: captainResponse,
      token
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

const forgotPasswordCaptain = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const captain = await Captain.findOne({ email });
    if (!captain) {
      // For security, don't disclose if captain exists, but since we are testing real validation, return error or success
      return res.status(404).json({ error: 'Captain not found' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    captain.password_reset_token = resetToken;
    captain.reset_token_expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
    await captain.save();

    await sendResetEmail(email, resetToken);

    return res.status(200).json({ message: 'Password reset link sent to your email.' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

const resetPasswordCaptain = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ error: 'Token and password are required' });
    }

    const captain = await Captain.findOne({
      password_reset_token: token,
      reset_token_expiry: { $gt: Date.now() }
    });

    if (!captain) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    captain.password = await bcrypt.hash(password, 10);
    captain.password_reset_token = null;
    captain.reset_token_expiry = null;
    await captain.save();

    return res.status(200).json({ message: 'Password reset successful.' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

module.exports = {
  signupUser,
  loginUser,
  logoutUser,
  signupCaptain,
  loginCaptain,
  forgotPasswordCaptain,
  resetPasswordCaptain
};
