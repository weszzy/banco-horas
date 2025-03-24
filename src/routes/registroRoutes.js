const express = require('express');
const {
    registrarEntrada,
    registrarSaidaAlmoco,
    registrarRetornoAlmoco,
    registrarSaidaFinal
} = require('../controllers/registroController');

const router = express.Router();

// Rotas para registro de ponto
router.post('/entrada', registrarEntrada);
router.post('/saida-almoco', registrarSaidaAlmoco);
router.post('/retorno-almoco', registrarRetornoAlmoco);
router.post('/saida-final', registrarSaidaFinal);

module.exports = router;