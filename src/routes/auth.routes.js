const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { validateLogin } = require('../middlewares/validation.middleware');

/**
 * @api {post} /auth/login Login de usuário
 * @apiName Login
 * @apiGroup Auth
 */
router.post('/login', validateLogin, authController.login);

module.exports = router;