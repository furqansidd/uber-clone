const express = require('express');
const router = express.Router();
const { toggleStatus } = require('../controllers/captainController');
const { authenticateCaptain } = require('../middlewares/auth');

router.post('/status', authenticateCaptain, toggleStatus);

module.exports = router;
