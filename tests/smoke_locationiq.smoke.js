require('dotenv').config();
const { getRoute } = require('../src/utils/routing');

describe('LocationIQ Integration Smoke Test (Real Network)', () => {
  it('should call the real LocationIQ API and parse the response', async () => {
    // NYC coordinates: Times Square to Central Park
    const pickup = {
      coordinates: [-73.985130, 40.758896] // [longitude, latitude]
    };
    const destination = {
      coordinates: [-73.968285, 40.785091]
    };

    // Ensure the key exists
    expect(process.env.LOCATIONIQ_API_KEY).toBeDefined();
    expect(process.env.LOCATIONIQ_API_KEY).not.toBe('mock_key');

    const route = await getRoute(pickup, destination, []);

    console.log('Real LocationIQ Response parsed:', route);

    // Verify properties
    expect(route).toBeDefined();
    expect(typeof route.distance).toBe('number');
    expect(typeof route.duration).toBe('number');
    expect(route.distance).toBeGreaterThan(0);
    expect(route.duration).toBeGreaterThan(0);
  });
});
