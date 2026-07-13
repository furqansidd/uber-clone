const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

const connect = async () => {
  await mongoose.disconnect();
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  // Wait for indexes to build to ensure spatial queries ($near) work properly
  await Promise.all(
    mongoose.modelNames().map((modelName) => mongoose.model(modelName).ensureIndexes())
  );
};

const close = async () => {
  try {
    await mongoose.disconnect();
  } catch (err) {
    // Ignore connection close errors in teardown
  }
  try {
    if (mongoServer) {
      await mongoServer.stop();
    }
  } catch (err) {
    // Ignore server stop errors in teardown
  }
};

const clear = async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
};

module.exports = {
  connect,
  close,
  clear
};
