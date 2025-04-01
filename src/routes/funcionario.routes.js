const express = require('express');
const router = express.Router();
const funcionarioController = require('../controllers/funcionario.controller');
const { validateFuncionario } = require('../middlewares/validation.middleware');

router.post('/', validateFuncionario, funcionarioController.cadastrar);
router.get('/', funcionarioController.listar);

module.exports = router;