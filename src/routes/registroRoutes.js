const express = require('express');
const {
    registrarEntrada,
    registrarSaidaAlmoco,
    registrarRetornoAlmoco,
    registrarSaidaFinal,
    listarRegistrosRecentes,
    listarHistoricoFuncionario
} = require('../controllers/registroController');

const router = express.Router();

// Rotas de registro
router.post('/entrada', registrarEntrada);
router.post('/saida-almoco', registrarSaidaAlmoco);
router.post('/retorno-almoco', registrarRetornoAlmoco);
router.post('/saida-final', registrarSaidaFinal);

// Rotas de consulta
router.get('/registros/recentes', listarRegistrosRecentes);
router.get('/historico/:funcionario', listarHistoricoFuncionario);

module.exports = router;