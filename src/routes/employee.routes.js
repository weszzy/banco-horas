const express = require('express');
const router = express.Router();
const { validateEmployee } = require('../middlewares/validation.middleware');
const employeeController = require('../controllers/employee.controller');

router.post('/', validateEmployee, employeeController.create);
const { authenticate, authorize } = require('../middlewares/auth.middleware');

router.post('/', authenticate, authorize(['admin']), employeeController.create);
router.get('/', authenticate, employeeController.getAll);

module.exports = router;