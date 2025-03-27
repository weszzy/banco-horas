const express = require('express');
const router = express.Router();
const timeRecordController = require('../controllers/time-record.controller');
const { authenticate } = require('../middlewares/auth.middleware');

router.post('/check-in', authenticate, timeRecordController.checkIn);
router.post('/check-out', authenticate, timeRecordController.checkOut);

module.exports = router;