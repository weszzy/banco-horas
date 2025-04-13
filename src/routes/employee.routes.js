// src/routes/employee.routes.js
const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employee.controller'); // Controller
const { authenticate, authorize } = require('../middlewares/auth.middleware'); // Middlewares de Auth
const { validateEmployee } = require('../middlewares/validation.middleware'); // Middleware de Validação (para criação)
// TODO: Criar e importar um middleware 'validateEmployeeUpdate' se a validação para PUT for diferente.

// === ROTAS PARA /api/employees ===

// Rota especial para o usuário logado obter seus próprios dados.
// Deve vir ANTES da rota genérica /:id para ter precedência.
// Acesso: Qualquer usuário autenticado.
router.get(
    '/me',
    authenticate,         // 1. Garante que está logado
    employeeController.getMe  // 2. Chama o método específico do controller
);

// Criar um novo funcionário.
// Acesso: Somente Admin autenticado.
// Validação: Aplica o middleware validateEmployee.
router.post(
    '/',
    authenticate,           // 1. Autentica
    authorize(['admin']),   // 2. Autoriza (só admin)
    validateEmployee,       // 3. Valida dados do body
    employeeController.create // 4. Chama o controller
);

// Listar todos os funcionários.
// Acesso: Somente Admin autenticado (ou Gerente, se adicionado ao role).
// Pode receber query params como ?active=true
router.get(
    '/',
    authenticate,
    authorize(['admin']), // Poderia ser ['admin', 'manager']
    employeeController.getAll
);

// Obter um funcionário específico pelo ID na URL.
// Acesso: Admin autenticado OU o próprio funcionário autenticado.
// A verificação de permissão (próprio usuário vs admin) é feita DENTRO do controller getById.
router.get(
    '/:id', // Ex: /api/employees/123
    authenticate,
    employeeController.getById
);

// Atualizar dados de um funcionário específico.
// Acesso: Somente Admin autenticado.
// NÃO atualiza senha, status ou saldo aqui (usar rotas específicas).
// TODO: Adicionar middleware de validação para os campos de update.
router.put(
    '/:id',
    authenticate,
    authorize(['admin']),
    // validateEmployeeUpdate, // Adicionar validação específica se necessário
    employeeController.update
);

// Ativar ou Desativar (atualizar status) de um funcionário específico.
// Usando PATCH pois é uma atualização parcial.
// Acesso: Somente Admin autenticado.
router.patch(
    '/:id/status', // Rota mais específica para status
    authenticate,
    authorize(['admin']),
    employeeController.updateStatus // Controller lida com a lógica
);


// ---- NOVA ROTA ----
// Zerar o saldo de horas de um funcionário específico.
router.patch(
    '/:id/zero-balance', // Rota específica para zerar saldo
    authenticate,
    authorize(['admin']),
    employeeController.zeroBalance // Novo método no controller
);

// Ajustar (somar/subtrair) o saldo de horas de um funcionário específico.
router.patch(
    '/:id/adjust-balance', // Rota específica para ajustar saldo
    authenticate,
    authorize(['admin']),
    employeeController.adjustBalance // Novo método no controller
);
// TODO: Adicionar rotas para reset de senha/PIN (se necessário), upload de foto, etc.

module.exports = router; // Exporta o router configurado