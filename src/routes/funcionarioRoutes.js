const express = require('express');
const router = express.Router();
const {
    cadastrarFuncionario,
    listarFuncionarios,
    getFuncionario
} = require('../controllers/funcionarioController');

router.post('/', cadastrarFuncionario);
router.get('/', listarFuncionarios);
router.get('/:id', getFuncionario);

module.exports = router;