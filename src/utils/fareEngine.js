const { getRoute } = require('./routing');

const VEHICLE_RATES = {
  bike: {
    base: 2.00,
    perKm: 0.50,
    perMin: 0.10
  },
  rickshaw: {
    base: 3.50,
    perKm: 0.80,
    perMin: 0.15
  },
  car: {
    base: 5.00,
    perKm: 1.20,
    perMin: 0.25
  }
};

const TAX_RATE = 0.05; // 5% flat tax/fees

const calculateFare = async (pickup, destination, stops = [], vehicleType = 'car') => {
  const rates = VEHICLE_RATES[vehicleType] || VEHICLE_RATES.car;

  // Retrieve route metrics from routing service
  const { distance, duration } = await getRoute(pickup, destination, stops);

  const base_fare = rates.base;
  const distance_fare = Number((distance * rates.perKm).toFixed(2));
  const time_fare = Number((duration * rates.perMin).toFixed(2));

  const subtotal = base_fare + distance_fare + time_fare;
  const taxes_fees = Number((subtotal * TAX_RATE).toFixed(2));
  const total = Number((subtotal + taxes_fees).toFixed(2));

  return {
    base_fare,
    distance_fare,
    time_fare,
    taxes_fees,
    total
  };
};

module.exports = {
  calculateFare,
  VEHICLE_RATES,
  TAX_RATE
};
