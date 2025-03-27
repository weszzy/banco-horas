const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employee.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.post('/', authenticate, authorize(['admin']), employeeController.create);
router.get('/', authenticate, employeeController.getAll);

module.exports = router;