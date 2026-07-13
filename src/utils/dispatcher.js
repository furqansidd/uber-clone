const { Captain, Ride } = require('../models');
const { sendToRoom } = require('../socket');

// In-memory tracker for active dispatch loops
// rideId -> { candidateCaptains, currentIndex, currentRadius, timer }
const activeDispatches = new Map();

const TIMEOUT_DURATION = process.env.NODE_ENV === 'test' ? 200 : 15000;
const INITIAL_RADIUS = 2000; // 2km
const RADIUS_INCREMENT = 2000; // +2km
const MAX_RADIUS = 10000; // 10km

const dispatchRide = async (ride) => {
  const rideId = ride._id.toString();
  
  // Clean up any existing dispatch for this ride
  cancelDispatch(rideId);

  activeDispatches.set(rideId, {
    candidateCaptains: [],
    currentIndex: 0,
    currentRadius: INITIAL_RADIUS,
    timer: null
  });

  await attemptNextDispatchBatch(rideId, ride);
};

const attemptNextDispatchBatch = async (rideId, ride) => {
  const dispatchState = activeDispatches.get(rideId);
  if (!dispatchState) return;

  const pickupLng = ride.pickup_coordinates.coordinates[0];
  const pickupLat = ride.pickup_coordinates.coordinates[1];

  // Find busy captains (assigned to active rides)
  const busyCaptains = await Ride.find({
    status: { $in: ['matched', 'driver_arriving', 'driver_arrived', 'ongoing'] },
    captain: { $exists: true, $ne: null }
  }).distinct('captain');

  // Query nearby idle online captains
  let captains = [];
  try {
    captains = await Captain.find({
      is_online: true,
      _id: { $nin: busyCaptains },
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [pickupLng, pickupLat]
          },
          $maxDistance: dispatchState.currentRadius
        }
      }
    });
  } catch (err) {
    console.error('Spatial query error during dispatch:', err);
  }

  if (captains.length > 0) {
    dispatchState.candidateCaptains = captains;
    dispatchState.currentIndex = 0;
    offerToCurrentCaptain(rideId, ride);
  } else {
    // No captains in this radius, expand
    dispatchState.currentRadius += RADIUS_INCREMENT;
    if (dispatchState.currentRadius <= MAX_RADIUS) {
      await attemptNextDispatchBatch(rideId, ride);
    } else {
      // Exceeded max search radius
      await markRideUnmatched(rideId, ride);
    }
  }
};

const offerToCurrentCaptain = async (rideId, ride) => {
  const dispatchState = activeDispatches.get(rideId);
  if (!dispatchState) return;

  const captain = dispatchState.candidateCaptains[dispatchState.currentIndex];
  if (!captain) {
    // End of current list, expand radius
    dispatchState.currentRadius += RADIUS_INCREMENT;
    if (dispatchState.currentRadius <= MAX_RADIUS) {
      await attemptNextDispatchBatch(rideId, ride);
    } else {
      await markRideUnmatched(rideId, ride);
    }
    return;
  }

  // Emit offer to captain's personal room
  sendToRoom(`captain_${captain._id.toString()}`, 'ride_offer', {
    ride_id: rideId,
    pickup_address: ride.pickup_address,
    destination_address: ride.destination_address,
    fare: ride.fare,
    timeout_seconds: TIMEOUT_DURATION / 1000
  });

  // Set timeout for expiration
  dispatchState.timer = setTimeout(async () => {
    await escalateOffer(rideId, ride);
  }, TIMEOUT_DURATION);
};

const escalateOffer = async (rideId, ride) => {
  const dispatchState = activeDispatches.get(rideId);
  if (!dispatchState) return;

  clearTimeout(dispatchState.timer);
  dispatchState.currentIndex += 1;
  offerToCurrentCaptain(rideId, ride);
};

const declineRideOffer = async (rideId, captainId) => {
  const dispatchState = activeDispatches.get(rideId);
  if (!dispatchState) return;

  const currentCaptain = dispatchState.candidateCaptains[dispatchState.currentIndex];
  if (currentCaptain && currentCaptain._id.toString() === captainId) {
    clearTimeout(dispatchState.timer);
    const ride = await Ride.findById(rideId);
    if (ride && ride.status === 'requested') {
      dispatchState.currentIndex += 1;
      offerToCurrentCaptain(rideId, ride);
    }
  }
};

const markRideUnmatched = async (rideId, ride) => {
  cancelDispatch(rideId);
  
  const updatedRide = await Ride.findById(rideId);
  if (updatedRide && updatedRide.status === 'requested') {
    updatedRide.status = 'unmatched';
    await updatedRide.save();

    // Notify Rider via socket
    sendToRoom(`rider_${updatedRide.rider.toString()}`, 'ride_unmatched', {
      ride_id: rideId,
      message: 'No captains accepted your request.'
    });
  }
};

const cancelDispatch = (rideId) => {
  const state = activeDispatches.get(rideId);
  if (state) {
    if (state.timer) clearTimeout(state.timer);
    activeDispatches.delete(rideId);
  }
};

const clearAllDispatches = () => {
  for (const [rideId, state] of activeDispatches.entries()) {
    if (state.timer) clearTimeout(state.timer);
  }
  activeDispatches.clear();
};

const isCaptainOffered = (rideId, captainId) => {
  const state = activeDispatches.get(rideId);
  if (!state) return false;
  const currentCaptain = state.candidateCaptains[state.currentIndex];
  return currentCaptain && currentCaptain._id.toString() === captainId;
};

module.exports = {
  dispatchRide,
  declineRideOffer,
  cancelDispatch,
  clearAllDispatches,
  isCaptainOffered
};
