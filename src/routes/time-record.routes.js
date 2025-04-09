// src/routes/time-record.routes.js
const express = require('express');
const router = express.Router();
const timeRecordController = require('../controllers/time-record.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// === ROTAS PARA /api/time-records ===

// router.use(authenticate); // <<<< TEMPORARIAMENTE COMENTADO PARA TESTE

// --- Rotas Mais Específicas PRIMEIRO ---
router.get('/ping', (req, res) => { /* ... */ });

// Rota para criar registro manual (Admin Only) - PRECISA DE AUTH
router.post('/manual',
    authenticate, // Adicionado individualmente
    authorize(['admin']),
    timeRecordController.createManualRecord
);

// Rota para obter o registro de HOJE do usuário logado - DEIXAR PÚBLICA TEMPORARIAMENTE
router.get('/today', timeRecordController.getTodaysRecord);


// --- Rotas de Ponto do Funcionário - PRECISAM DE AUTH ---
router.post('/check-in', authenticate, timeRecordController.checkIn);
router.post('/lunch-start', authenticate, timeRecordController.startLunch);
router.post('/lunch-end', authenticate, timeRecordController.endLunch);
router.post('/check-out', authenticate, timeRecordController.checkOut);

// --- Rotas com Parâmetros - PRECISAM DE AUTH ---
// Histórico requer autenticação, pois pode expor dados
router.get('/employee/:employeeId', authenticate, timeRecordController.getHistory);
router.get('/employee/:employeeId/balance-history', authenticate, timeRecordController.getBalanceHistory);

// Remover um registro específico (Admin Only) - PRECISA DE AUTH
router.delete('/:recordId(\\d+)',
    authenticate, // Adicionado individualmente
    authorize(['admin']),
    timeRecordController.deleteRecord
);

module.exports = router;