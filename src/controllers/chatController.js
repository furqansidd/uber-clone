const { Message, Ride } = require('../models');
const { sendToRoom } = require('../socket');

const sendMessage = async (req, res) => {
  try {
    const { id: rideId } = req.params;
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Message text is required' });
    }

    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    if (req.user && ride.rider.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied: you are not part of this ride' });
    }
    if (req.captain && (!ride.captain || ride.captain.toString() !== req.captain._id.toString())) {
      return res.status(403).json({ error: 'Access denied: you are not part of this ride' });
    }

    let sender_role;
    let sender_id;

    if (req.user) {
      sender_role = 'rider';
      sender_id = req.user._id.toString();
    } else if (req.captain) {
      sender_role = 'captain';
      sender_id = req.captain._id.toString();
    } else {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const message = new Message({
      ride_id: ride._id,
      sender_role,
      sender_id,
      text,
      timestamp: new Date()
    });

    await message.save();

    // Broadcast message to the ride socket room
    sendToRoom(`ride_${ride._id.toString()}`, 'new_message', message);

    return res.status(201).json({
      message: 'Message sent successfully',
      message
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

const getMessages = async (req, res) => {
  try {
    const { id: rideId } = req.params;
    
    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    if (req.user && ride.rider.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied: you are not part of this ride' });
    }
    if (req.captain && (!ride.captain || ride.captain.toString() !== req.captain._id.toString())) {
      return res.status(403).json({ error: 'Access denied: you are not part of this ride' });
    }

    const messages = await Message.find({ ride_id: ride._id }).sort({ timestamp: 1 });

    return res.status(200).json({
      messages
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

module.exports = {
  sendMessage,
  getMessages
};
