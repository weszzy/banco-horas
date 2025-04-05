const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employee.controller');
// Importa os middlewares necessários do local correto
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { validateEmployee } = require('../middlewares/validation.middleware');

// === ROTAS PARA FUNCIONÁRIOS ===

// Criar um novo funcionário
// Requer autenticação E autorização (somente 'admin') E validação dos dados
router.post(
    '/',
    authenticate,           // 1. Verifica se está logado
    authorize(['admin']),   // 2. Verifica se é admin
    validateEmployee,       // 3. Valida os dados do body (fullName, email, password, etc.)
    employeeController.create // 4. Chama o controller
);

// Listar todos os funcionários
// Requer apenas autenticação (qualquer usuário logado pode ver a lista)
router.get(
    '/',
    authenticate,
    employeeController.getAll
);

// Obter um funcionário específico pelo ID
// Requer apenas autenticação (qualquer usuário logado pode ver um perfil)
// A lógica de permissão mais granular (só admin ou o próprio usuário) pode ficar no controller se necessário
router.get(
    '/:id', // :id será o parâmetro na URL (ex: /api/employees/123)
    authenticate,
    employeeController.getById
);


// TODO: Definir rotas para PUT (atualizar) e DELETE (remover) funcionários
// Exemplo:
// router.put('/:id', authenticate, authorize(['admin']), validateEmployeeUpdate, employeeController.update);
// router.delete('/:id', authenticate, authorize(['admin']), employeeController.delete);


module.exports = router;