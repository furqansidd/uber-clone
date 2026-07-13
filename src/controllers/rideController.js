const { Ride } = require('../models');
const { dispatchRide, declineRideOffer, cancelDispatch, isCaptainOffered } = require('../utils/dispatcher');
const { getIo, sendToRoom } = require('../socket');
const { calculateFare } = require('../utils/fareEngine');

const requestRide = async (req, res) => {
  try {
    const {
      pickup_address,
      pickup_coordinates,
      destination_address,
      destination_coordinates,
      vehicle_type
    } = req.body;

    if (!pickup_address || !pickup_coordinates || !destination_address || !destination_coordinates || !vehicle_type) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const { latitude: plat, longitude: plng } = pickup_coordinates;
    const { latitude: dlat, longitude: dlng } = destination_coordinates;

    if (plat === undefined || plng === undefined || dlat === undefined || dlng === undefined) {
      return res.status(400).json({ error: 'Coordinates must include latitude and longitude' });
    }

    // Generate random 4-digit OTP
    const otp_code = Math.floor(1000 + Math.random() * 9000).toString();

    const pickup_coordinates_point = { type: 'Point', coordinates: [Number(plng), Number(plat)] };
    const destination_coordinates_point = { type: 'Point', coordinates: [Number(dlng), Number(dlat)] };

    // Calculate real fare using the fare engine
    const fare = await calculateFare(
      pickup_coordinates_point,
      destination_coordinates_point,
      [],
      vehicle_type
    );

    const ride = new Ride({
      rider: req.user._id,
      pickup_address,
      pickup_coordinates: pickup_coordinates_point,
      destination_address,
      destination_coordinates: destination_coordinates_point,
      vehicle_type,
      fare,
      otp_code,
      status: 'requested',
      timestamps: {
        requestedAt: new Date()
      }
    });

    await ride.save();

    // Trigger sequential spatial dispatch
    dispatchRide(ride);

    return res.status(201).json({
      message: 'Ride request created successfully',
      ride
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

const acceptRide = async (req, res) => {
  try {
    const { id } = req.params;
    const ride = await Ride.findById(id);
    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    if (ride.status !== 'requested') {
      return res.status(400).json({ error: 'Ride is not available' });
    }

    if (!isCaptainOffered(id, req.captain._id.toString())) {
      return res.status(403).json({ error: 'Access denied: this ride is not offered to you' });
    }

    // Assign captain and transition status directly to driver_arriving
    ride.captain = req.captain._id;
    ride.status = 'driver_arriving';
    ride.timestamps.matchedAt = new Date();
    ride.timestamps.arrivingAt = new Date();
    await ride.save();

    const rideIdStr = ride._id.toString();

    // Cancel matching dispatch loop
    cancelDispatch(rideIdStr);

    // Auto join rider and captain sockets to ride room
    try {
      const io = getIo();
      const sockets = await io.fetchSockets();
      for (const socket of sockets) {
        if (
          socket.riderId === ride.rider.toString() ||
          socket.captainId === ride.captain.toString()
        ) {
          socket.join(`ride_${rideIdStr}`);
        }
      }
    } catch (socketErr) {
      // Ignore if socket server is not active (e.g. in basic HTTP tests)
    }

    // Broadcast ride_matched to the ride room
    sendToRoom(`ride_${rideIdStr}`, 'ride_matched', {
      ride_id: rideIdStr,
      status: 'driver_arriving',
      captain: ride.captain
    });

    return res.status(200).json({
      message: 'Ride accepted successfully',
      ride
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

const declineRide = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isCaptainOffered(id, req.captain._id.toString())) {
      return res.status(403).json({ error: 'Access denied: this ride is not offered to you' });
    }

    // Escalate to next captain
    await declineRideOffer(id, req.captain._id.toString());

    return res.status(200).json({ message: 'Ride offer declined' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

const arrivedRide = async (req, res) => {
  try {
    const { id } = req.params;
    const ride = await Ride.findById(id);
    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    if (!ride.captain || ride.captain.toString() !== req.captain._id.toString()) {
      return res.status(403).json({ error: 'Access denied: you are not the assigned captain' });
    }

    ride.status = 'driver_arrived';
    ride.timestamps.arrivedAt = new Date();
    await ride.save();

    const rideIdStr = ride._id.toString();

    // Broadcast ride_arrived
    sendToRoom(`ride_${rideIdStr}`, 'ride_arrived', {
      ride_id: rideIdStr,
      status: 'driver_arrived'
    });

    return res.status(200).json({
      message: 'Captain arrived at pickup',
      ride
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

const startRide = async (req, res) => {
  try {
    const { id } = req.params;
    const { otp_code } = req.body;
    if (!otp_code) {
      return res.status(400).json({ error: 'OTP code is required' });
    }

    const ride = await Ride.findById(id);
    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    if (!ride.captain || ride.captain.toString() !== req.captain._id.toString()) {
      return res.status(403).json({ error: 'Access denied: you are not the assigned captain' });
    }

    if (ride.otp_code !== otp_code) {
      return res.status(400).json({ error: 'Invalid OTP code' });
    }

    ride.status = 'ongoing';
    ride.timestamps.startedAt = new Date();
    await ride.save();

    const rideIdStr = ride._id.toString();

    // Broadcast ride_started
    sendToRoom(`ride_${rideIdStr}`, 'ride_started', {
      ride_id: rideIdStr,
      status: 'ongoing'
    });

    return res.status(200).json({
      message: 'Ride started successfully',
      ride
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

const completeRide = async (req, res) => {
  try {
    const { id } = req.params;
    const ride = await Ride.findById(id);
    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    if (!ride.captain || ride.captain.toString() !== req.captain._id.toString()) {
      return res.status(403).json({ error: 'Access denied: you are not the assigned captain' });
    }

    ride.status = 'completed';
    ride.timestamps.completedAt = new Date();
    await ride.save();

    const rideIdStr = ride._id.toString();

    // Broadcast ride_completed
    sendToRoom(`ride_${rideIdStr}`, 'ride_completed', {
      ride_id: rideIdStr,
      status: 'completed'
    });

    return res.status(200).json({
      message: 'Ride completed successfully',
      ride
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

const cancelRide = async (req, res) => {
  try {
    const { id } = req.params;
    const ride = await Ride.findById(id);
    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    const rideIdStr = ride._id.toString();

    // Cancel dispatch if requested
    cancelDispatch(rideIdStr);

    // Determine roles and enforce ownership
    if (req.user) {
      if (ride.rider.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: 'Access denied: not your ride' });
      }
      ride.status = 'cancelled_by_rider';
    } else if (req.captain) {
      if (!ride.captain || ride.captain.toString() !== req.captain._id.toString()) {
        return res.status(403).json({ error: 'Access denied: not your assigned ride' });
      }
      ride.status = 'cancelled_by_driver';
    }

    ride.timestamps.cancelledAt = new Date();
    await ride.save();

    // Broadcast ride_cancelled
    sendToRoom(`ride_${rideIdStr}`, 'ride_cancelled', {
      ride_id: rideIdStr,
      status: ride.status
    });

    return res.status(200).json({
      message: 'Ride cancelled successfully',
      ride
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

const addStop = async (req, res) => {
  try {
    const { id } = req.params;
    const { address, coordinates } = req.body;

    if (!address || !coordinates) {
      return res.status(400).json({ error: 'Address and coordinates are required' });
    }

    const { latitude, longitude } = coordinates;
    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'Coordinates must include latitude and longitude' });
    }

    const ride = await Ride.findById(id);
    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    if (!req.user || ride.rider.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied: you are not the rider of this ride' });
    }

    // Insert stop into stops array
    ride.stops.push({
      address,
      coordinates: { type: 'Point', coordinates: [Number(longitude), Number(latitude)] }
    });

    // Recalculate fare dynamically with the new stop included
    const updatedFare = await calculateFare(
      ride.pickup_coordinates,
      ride.destination_coordinates,
      ride.stops,
      ride.vehicle_type
    );

    ride.fare = updatedFare;

    await ride.save();

    const rideIdStr = ride._id.toString();

    // Broadcast ride_updated
    sendToRoom(`ride_${rideIdStr}`, 'ride_updated', ride);

    return res.status(200).json({
      message: 'Stop added successfully',
      ride
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

module.exports = {
  requestRide,
  acceptRide,
  declineRide,
  arrivedRide,
  startRide,
  completeRide,
  cancelRide,
  addStop
};
