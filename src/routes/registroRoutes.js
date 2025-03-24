const express = require('express');
const { registrarEntrada, registrarSaida, listarRegistros } = require('../controllers/registroController');

const router = express.Router();

// Rota para registrar entrada
router.post('/entrada', registrarEntrada);

// Rota para registrar saída
router.post('/saida', registrarSaida);

// Rota para listar registros
router.get('/registros', listarRegistros);

module.exports = router;