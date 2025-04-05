const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { validateLogin } = require('../middlewares/validation.middleware'); // Usando o middleware de validação correto

/**
 * @route POST /api/auth/login
 * @description Autentica um usuário e retorna um token JWT.
 * @access Public
 */
router.post('/login', validateLogin, authController.login); // Aplica validação antes do controller

module.exports = router;