const { Captain } = require('../models');

const toggleStatus = async (req, res) => {
  try {
    const { is_online, latitude, longitude } = req.body;
    if (is_online === undefined) {
      return res.status(400).json({ error: 'is_online field is required' });
    }

    const captain = req.captain;
    captain.is_online = is_online;

    if (latitude !== undefined && longitude !== undefined) {
      captain.location = {
        type: 'Point',
        coordinates: [Number(longitude), Number(latitude)] // coordinates: [longitude, latitude]
      };
    }

    await captain.save();

    return res.status(200).json({
      message: 'Status updated successfully',
      captain
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

module.exports = {
  toggleStatus
};
