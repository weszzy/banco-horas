// src/routes/time-record.routes.js
const express = require('express');
const router = express.Router();
const timeRecordController = require('../controllers/time-record.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// === ROTAS PARA /api/time-records ===

// ROTA DE TESTE SIMPLES (Pode manter ou remover)
router.get('/ping', (req, res) => { /* ... */ });

// --- Rotas que PRECISAM de Autenticação ---

// Aplica authenticate a todas as rotas definidas DEPOIS desta linha
router.use(authenticate);

// Rota para criar registro manual (Admin Only)
router.post('/manual', authorize(['admin']), timeRecordController.createManualRecord);

// Rota para obter o registro de HOJE do usuário logado
router.get('/today', timeRecordController.getTodaysRecord); // Agora está protegida por router.use(authenticate)

// Rotas de Ponto do Funcionário
router.post('/check-in', timeRecordController.checkIn);
router.post('/lunch-start', timeRecordController.startLunch);
router.post('/lunch-end', timeRecordController.endLunch);
router.post('/check-out', timeRecordController.checkOut);

// Rotas de Histórico (Também precisam de autenticação)
router.get('/employee/:employeeId', timeRecordController.getHistory);
router.get('/employee/:employeeId/balance-history', timeRecordController.getBalanceHistory);

// Rotas Administrativas (Já tinham authorize, mas precisam de authenticate antes)
router.delete('/:recordId(\\d+)', authorize(['admin']), timeRecordController.deleteRecord);;
router.post('/manual', authorize(['admin']), timeRecordController.createManualRecord);

// Editar um registro de ponto existente
router.put(
    '/:recordId(\\d+)', // Usa o ID do registro na URL
    authorize(['admin']), // Somente admin
    // TODO: Adicionar middleware de validação específico para os dados de edição?
    timeRecordController.updateRecord // Novo método no controller
);


module.exports = router;