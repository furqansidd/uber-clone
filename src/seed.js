const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const dns = require('dns');
const { User, Captain } = require('./models');

// Configure custom DNS resolution to resolve Atlas hostname correctly in dev environments
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  console.log("DNS setServers not supported or failed");
}

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

async function seed() {
  if (!MONGODB_URI) {
    console.error("MONGODB_URI is not set in environment!");
    process.exit(1);
  }

  console.log("Connecting to database...");
  await mongoose.connect(MONGODB_URI);
  console.log("Connected successfully.");

  // Delete existing seed accounts
  await User.deleteMany({ email: 'rider@test.com' });
  await Captain.deleteMany({ email: 'captain@test.com' });

  // Create Rider
  const hashedRiderPassword = await bcrypt.hash('Password123', 10);
  const rider = new User({
    first_name: 'Sarah',
    last_name: 'Miller',
    email: 'rider@test.com',
    password: hashedRiderPassword,
    rating: 4.9
  });
  await rider.save();
  console.log("Rider seeded: rider@test.com / Password123");

  // Create Captain
  const hashedCaptainPassword = await bcrypt.hash('Password123', 10);
  const captain = new Captain({
    full_name: 'Sarah Jenkins',
    phone_number: '555-0123',
    vehicle_type: 'car',
    plate_number: 'NYC-777',
    capacity: 4,
    vehicle_color: 'Black',
    terms_accepted: true,
    email: 'captain@test.com',
    password: hashedCaptainPassword,
    rating: 4.9,
    is_online: false,
    location: {
      type: 'Point',
      coordinates: [-73.9855, 40.7580] // Times Square
    }
  });
  await captain.save();
  console.log("Captain seeded: captain@test.com / Password123");

  await mongoose.disconnect();
  console.log("Disconnected successfully.");
}

seed().catch(err => {
  console.error("Error seeding database:", err);
  process.exit(1);
});
