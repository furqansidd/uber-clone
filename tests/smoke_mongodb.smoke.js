require('dotenv').config();
const mongoose = require('mongoose');

const dns = require('dns');

describe('MongoDB Atlas Integration Smoke Test (Real Network)', () => {
  let connection;

  beforeAll(async () => {
    // Force DNS servers to Google/Cloudflare to resolve Atlas SRV records correctly
    try {
      dns.setServers(['8.8.8.8', '1.1.1.1']);
    } catch (e) {
      // Ignore if not supported in this env
    }

    // Ensure the key exists and is Atlas connection
    expect(process.env.MONGODB_URI).toBeDefined();
    expect(process.env.MONGODB_URI).toContain('mongodb+srv://');

    connection = await mongoose.connect(process.env.MONGODB_URI);
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  it('should successfully perform write, read, and delete on real MongoDB Atlas', async () => {
    // 1. Define a temporary schema and model
    const SmokeSchema = new mongoose.Schema({
      message: String,
      createdAt: { type: Date, default: Date.now }
    });
    const SmokeModel = mongoose.model('SmokeTestDocument', SmokeSchema);

    // 2. Perform Write
    const doc = new SmokeModel({ message: 'SwiftRide Atlas Smoke Test' });
    const savedDoc = await doc.save();
    expect(savedDoc._id).toBeDefined();
    expect(savedDoc.message).toBe('SwiftRide Atlas Smoke Test');

    // 3. Perform Read
    const foundDoc = await SmokeModel.findById(savedDoc._id);
    expect(foundDoc).toBeDefined();
    expect(foundDoc.message).toBe('SwiftRide Atlas Smoke Test');

    // 4. Perform Delete
    const deletedResult = await SmokeModel.deleteOne({ _id: savedDoc._id });
    expect(deletedResult.deletedCount).toBe(1);

    // Clean up collection/model indexes/etc.
    await SmokeModel.collection.drop();
  });
});
