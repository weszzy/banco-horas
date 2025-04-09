// src/routes/time-record.routes.js
const express = require('express');
const router = express.Router();
const timeRecordController = require('../controllers/time-record.controller');
// Importa authorize também
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// === ROTAS PARA /api/time-records ===

// Aplicar autenticação básica a todas as rotas abaixo
router.use(authenticate);

// --- Rotas do Funcionário ---
router.post('/check-in', timeRecordController.checkIn);
router.post('/lunch-start', timeRecordController.startLunch);
router.post('/lunch-end', timeRecordController.endLunch);
router.post('/check-out', timeRecordController.checkOut);

// --- ROTA ADICIONADA ---
// Obter o registro de ponto de HOJE para o usuário logado
router.get('/today', timeRecordController.getTodaysRecord);
// ----------------------

// Histórico simples e com saldo são acessíveis por funcionário (para si) e admin
router.get('/employee/:employeeId', timeRecordController.getHistory);
router.get('/employee/:employeeId/balance-history', timeRecordController.getBalanceHistory);

// --- Rotas Administrativas ---

// Remover um registro de ponto específico (Admin Only)
router.delete('/:recordId(\\d+)', authorize(['admin']), timeRecordController.deleteRecord);

// Criar um registro de ponto manualmente (Admin Only)
router.post('/manual', authorize(['admin']), timeRecordController.createManualRecord);

module.exports = router; // Exporta o router configurado