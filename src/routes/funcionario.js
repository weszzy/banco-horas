const express = require('express');
const router = express.Router();
const funcionarioController = require('../controllers/funcionario');

router.post('/', funcionarioController.cadastrar);
router.get('/', funcionarioController.listar);
router.get('/:id', funcionarioController.obterPorId);

module.exports = router;