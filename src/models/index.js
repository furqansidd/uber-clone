const mongoose = require('mongoose');
const { Schema } = mongoose;

// GeoJSON Point Schema Helper
const PointSchema = new Schema({
  type: {
    type: String,
    enum: ['Point'],
    default: 'Point',
    required: true
  },
  coordinates: {
    type: [Number], // [longitude, latitude]
    required: true
  }
}, { _id: false });

// 1. User (Rider) Schema
const UserSchema = new Schema({
  first_name: { type: String, required: true },
  last_name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  rating: { type: Number, default: 5.0 },
  refresh_token: { type: String }
}, { timestamps: true });

// 2. Captain Schema
const CaptainSchema = new Schema({
  full_name: { type: String, required: true },
  phone_number: { type: String, required: true },
  vehicle_type: { type: String, required: true, enum: ['bike', 'rickshaw', 'car'] },
  plate_number: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^[a-zA-Z0-9-]{3,15}$/.test(v);
      },
      message: props => `${props.value} is not a valid plate number format!`
    }
  },
  capacity: {
    type: Number,
    required: true,
    min: [1, 'Capacity must be at least 1']
  },
  vehicle_color: { type: String, required: true },
  terms_accepted: { type: Boolean, required: true, default: false },
  is_online: { type: Boolean, default: false },
  location: {
    type: PointSchema,
    default: { type: 'Point', coordinates: [0, 0] }
  },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  rating: { type: Number, default: 5.0 },
  password_reset_token: { type: String },
  reset_token_expiry: { type: Date }
}, { timestamps: true });

// Geo-spatial index for Captain location
CaptainSchema.index({ location: '2dsphere' });

// 3. Stop Schema
const StopSchema = new Schema({
  address: { type: String, required: true },
  coordinates: { type: PointSchema, required: true }
}, { _id: false });

// 4. Ride Schema
const RideSchema = new Schema({
  rider: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  captain: { type: Schema.Types.ObjectId, ref: 'Captain' },
  pickup_address: { type: String, required: true },
  pickup_coordinates: { type: PointSchema, required: true },
  destination_address: { type: String, required: true },
  destination_coordinates: { type: PointSchema, required: true },
  stops: [StopSchema],
  vehicle_type: { type: String, required: true, enum: ['bike', 'rickshaw', 'car'] },
  fare: {
    base_fare: { type: Number, default: 0 },
    distance_fare: { type: Number, default: 0 },
    time_fare: { type: Number, default: 0 },
    taxes_fees: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  },
  otp_code: { type: String, required: true },
  status: {
    type: String,
    required: true,
    enum: [
      'requested',
      'matched',
      'driver_arriving',
      'driver_arrived',
      'ongoing',
      'completed',
      'cancelled_by_rider',
      'cancelled_by_driver',
      'unmatched'
    ],
    default: 'requested'
  },
  timestamps: {
    requestedAt: { type: Date },
    matchedAt: { type: Date },
    arrivingAt: { type: Date },
    arrivedAt: { type: Date },
    startedAt: { type: Date },
    completedAt: { type: Date },
    cancelledAt: { type: Date }
  }
}, { timestamps: true });

// 5. Message Schema
const MessageSchema = new Schema({
  ride_id: { type: Schema.Types.ObjectId, ref: 'Ride', required: true },
  sender_role: { type: String, required: true, enum: ['rider', 'captain'] },
  sender_id: { type: String, required: true },
  text: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

// 6. TokenBlacklist Schema
const TokenBlacklistSchema = new Schema({
  token: { type: String, required: true, unique: true },
  expiry: { type: Date, required: true }
});

// TTL index to automatically delete expired blacklisted tokens
TokenBlacklistSchema.index({ expiry: 1 }, { expireAfterSeconds: 0 });

const User = mongoose.model('User', UserSchema);
const Captain = mongoose.model('Captain', CaptainSchema);
const Ride = mongoose.model('Ride', RideSchema);
const Message = mongoose.model('Message', MessageSchema);
const TokenBlacklist = mongoose.model('TokenBlacklist', TokenBlacklistSchema);

module.exports = {
  User,
  Captain,
  Ride,
  Message,
  TokenBlacklist
};
