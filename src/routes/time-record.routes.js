// src/routes/time-record.routes.js
const express = require('express');
const router = express.Router();
const timeRecordController = require('../controllers/time-record.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// === ROTAS PARA /api/time-records ===

// Aplica autenticação básica a todas as rotas abaixo
router.use(authenticate);

// --- Rotas Mais Específicas PRIMEIRO ---

// ROTA DE TESTE SIMPLES
router.get('/ping', (req, res) => {
    console.log('>>> ROTA /api/time-records/ping ACESSADA <<<');
    res.status(200).json({ message: 'pong from time-records' });
});

// Rota para criar registro manual (Admin Only)
router.post('/manual',
    authorize(['admin']),
    timeRecordController.createManualRecord
);

// Rota para obter o registro de HOJE do usuário logado
router.get('/today', timeRecordController.getTodaysRecord);


// --- Rotas de Ponto do Funcionário ---
router.post('/check-in', timeRecordController.checkIn);
router.post('/lunch-start', timeRecordController.startLunch);
router.post('/lunch-end', timeRecordController.endLunch);
router.post('/check-out', timeRecordController.checkOut);


// --- Rotas com Parâmetros (Mais Genéricas) DEPOIS ---

// Rota para obter histórico SIMPLES de um funcionário
router.get('/employee/:employeeId', timeRecordController.getHistory);

// Rota para obter histórico COM SALDO de um funcionário
router.get('/employee/:employeeId/balance-history', timeRecordController.getBalanceHistory);

// Rota para remover um registro específico (Admin Only)
// Nota: :recordId será um número, não conflita com '/today' ou '/manual'
router.delete('/:recordId(\\d+)',
    authorize(['admin']),
    timeRecordController.deleteRecord
);

module.exports = router; // Exporta o router configurado