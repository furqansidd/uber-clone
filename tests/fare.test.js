const request = require('supertest');
const dbHandler = require('./db');
const app = require('../src/app');
const { calculateFare } = require('../src/utils/fareEngine');
const { getRoute } = require('../src/utils/routing');

// Mock routing module
jest.mock('../src/utils/routing', () => ({
  getRoute: jest.fn()
}));

describe('Fare Engine Integration (TDD)', () => {
  beforeAll(async () => {
    await dbHandler.connect();
  });

  afterEach(async () => {
    await dbHandler.clear();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await dbHandler.close();
  });

  describe('calculateFare logic', () => {
    it('should calculate correct fare for car with 5% tax and no stops', async () => {
      // Mock route returning 10km and 20 mins (1200 seconds)
      getRoute.mockResolvedValue({
        distance: 10.0, // km
        duration: 20.0  // minutes
      });

      const pickup = { coordinates: [-73.93, 40.73] };
      const dest = { coordinates: [-73.95, 40.75] };
      const stops = [];

      const fare = await calculateFare(pickup, dest, stops, 'car');

      // Rates for car: base = 5.00, per km = 1.20, per min = 0.25
      // distance_fare = 10 * 1.20 = 12.00
      // time_fare = 20 * 0.25 = 5.00
      // subtotal = 5.00 + 12.00 + 5.00 = 22.00
      // taxes_fees = 22.00 * 0.05 = 1.10
      // total = 23.10
      expect(fare.base_fare).toBeCloseTo(5.00, 2);
      expect(fare.distance_fare).toBeCloseTo(12.00, 2);
      expect(fare.time_fare).toBeCloseTo(5.00, 2);
      expect(fare.taxes_fees).toBeCloseTo(1.10, 2);
      expect(fare.total).toBeCloseTo(23.10, 2);
    });

    it('should calculate correct fare for bike with 5% tax and 1 stop', async () => {
      // Mock route returning total 5km and 10 mins
      getRoute.mockResolvedValue({
        distance: 5.0, // km
        duration: 10.0 // minutes
      });

      const pickup = { coordinates: [-73.93, 40.73] };
      const dest = { coordinates: [-73.95, 40.75] };
      const stops = [{ coordinates: [-73.94, 40.74] }];

      const fare = await calculateFare(pickup, dest, stops, 'bike');

      // Rates for bike: base = 2.00, per km = 0.50, per min = 0.10
      // distance_fare = 5 * 0.50 = 2.50
      // time_fare = 10 * 0.10 = 1.00
      // subtotal = 2.00 + 2.50 + 1.00 = 5.50
      // taxes_fees = 5.50 * 0.05 = 0.275 -> 0.28
      // total = 5.78
      expect(fare.base_fare).toBeCloseTo(2.00, 2);
      expect(fare.distance_fare).toBeCloseTo(2.50, 2);
      expect(fare.time_fare).toBeCloseTo(1.00, 2);
      expect(fare.taxes_fees).toBeCloseTo(0.28, 2);
      expect(fare.total).toBeCloseTo(5.78, 2);
    });
  });
});
