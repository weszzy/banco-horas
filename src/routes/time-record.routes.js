// src/routes/time-record.routes.js
const express = require('express');
const router = express.Router();
const timeRecordController = require('../controllers/time-record.controller');

// --- CORREÇÃO: Importar 'authenticate' E 'authorize' ---
const { authenticate, authorize } = require('../middlewares/auth.middleware');
// --------------------------------------------------------

// === ROTAS PARA /api/time-records ===

// Aplica autenticação básica a todas as rotas abaixo
router.use(authenticate);

// --- Rotas do Funcionário ---
router.post('/check-in', timeRecordController.checkIn);
router.post('/lunch-start', timeRecordController.startLunch);
router.post('/lunch-end', timeRecordController.endLunch);
router.post('/check-out', timeRecordController.checkOut);
router.get('/today', timeRecordController.getTodaysRecord);
// Histórico simples e com saldo são acessíveis por funcionário (para si) e admin
router.get('/employee/:employeeId', timeRecordController.getHistory);
router.get('/employee/:employeeId/balance-history', timeRecordController.getBalanceHistory);

// --- Rotas Administrativas ---

// Remover um registro de ponto específico (Admin Only)
// A linha 39 agora terá 'authorize' definido
router.delete(
    '/:recordId(\\d+)',   // Garante que recordId seja numérico
    authorize(['admin']), // Somente admin pode deletar (authorize agora está definido)
    timeRecordController.deleteRecord
);

// Criar um registro de ponto manualmente (Admin Only)
router.post(
    '/manual',
    authorize(['admin']), // Somente admin pode criar manualmente (authorize agora está definido)
    // TODO: Adicionar um middleware de validação específico para os dados manuais?
    timeRecordController.createManualRecord
);

module.exports = router; // Exporta o router configurado