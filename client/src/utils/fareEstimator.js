export const VEHICLE_RATES = {
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

export const TAX_RATE = 0.05;

export const estimateFare = (pickupCoords, destCoords, vehicleType = 'car') => {
  // Simple flat earth distance calculation matching backend fallback
  const dLat = destCoords.latitude - pickupCoords.latitude;
  const dLng = destCoords.longitude - pickupCoords.longitude;
  const distance = 1.1 * Math.sqrt(dLat * dLat + dLng * dLng) * 111; // km
  const duration = distance * 2; // 2 minutes per km

  const rates = VEHICLE_RATES[vehicleType] || VEHICLE_RATES.car;
  const base_fare = rates.base;
  const distance_fare = Number((distance * rates.perKm).toFixed(2));
  const time_fare = Number((duration * rates.perMin).toFixed(2));

  const subtotal = base_fare + distance_fare + time_fare;
  const taxes_fees = Number((subtotal * TAX_RATE).toFixed(2));
  const total = Number((subtotal + taxes_fees).toFixed(2));

  return {
    distance: Number(distance.toFixed(2)),
    duration: Number(duration.toFixed(2)),
    base_fare,
    distance_fare,
    time_fare,
    taxes_fees,
    total
  };
};
