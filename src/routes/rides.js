const express = require('express');
const router = express.Router();
const {
  requestRide,
  acceptRide,
  declineRide,
  arrivedRide,
  startRide,
  completeRide,
  cancelRide,
  addStop
} = require('../controllers/rideController');
const {
  sendMessage,
  getMessages
} = require('../controllers/chatController');
const {
  authenticateUser,
  authenticateCaptain,
  authenticateUserOrCaptain
} = require('../middlewares/auth');

router.post('/request', authenticateUser, requestRide);
router.post('/:id/accept', authenticateCaptain, acceptRide);
router.post('/:id/decline', authenticateCaptain, declineRide);
router.post('/:id/arrived', authenticateCaptain, arrivedRide);
router.post('/:id/start', authenticateCaptain, startRide);
router.post('/:id/complete', authenticateCaptain, completeRide);
router.delete('/:id', authenticateUserOrCaptain, cancelRide);
router.post('/:id/stops', authenticateUserOrCaptain, addStop);
router.post('/:id/messages', authenticateUserOrCaptain, sendMessage);
router.get('/:id/messages', authenticateUserOrCaptain, getMessages);

module.exports = router;
