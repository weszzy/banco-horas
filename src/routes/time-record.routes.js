const express = require('express');
const router = express.Router();
const timeRecordController = require('../controllers/time-record.controller');
const { authenticate } = require('../middlewares/auth.middleware'); // Middleware de autenticação

// === ROTAS PARA REGISTRO DE PONTO ===

// Aplicar autenticação a todas as rotas abaixo, pois todas exigem um usuário logado
router.use(authenticate);

// Registrar Check-in (Início do expediente)
router.post('/check-in', timeRecordController.checkIn);

// Registrar Saída para Almoço
router.post('/lunch-start', timeRecordController.startLunch);

// Registrar Retorno do Almoço
router.post('/lunch-end', timeRecordController.endLunch);

// Registrar Check-out (Fim do expediente)
router.post('/check-out', timeRecordController.checkOut);

// Obter o registro de ponto de HOJE para o usuário logado
router.get('/today', timeRecordController.getTodaysRecord);

// Obter o HISTÓRICO de registros para um funcionário específico (ID na URL)
// A verificação de permissão (admin vs próprio usuário) é feita no controller
router.get('/employee/:employeeId', timeRecordController.getHistory);


module.exports = router;