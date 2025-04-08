// src/controllers/time-record.controller.js
const { TimeRecord } = require('../models/time-record.model'); // Modelo de Registro
const { Employee } = require('../models/employee.model'); // Modelo de Funcionário
const BalanceService = require('../services/balance.service'); // Serviço de cálculo de saldo
const { sendResponse } = require('../utils/response.util'); // Helper de resposta
const logger = require('../utils/logger.util'); // Logger
const { Op } = require('sequelize'); // Operadores Sequelize
const { sequelize } = require('../config/database'); // Instância do Sequelize para transações

class TimeRecordController {

  // Construtor para vincular o contexto 'this' aos métodos de rota
  constructor() {
    this.checkIn = this.checkIn.bind(this);
    this.startLunch = this.startLunch.bind(this);
    this.endLunch = this.endLunch.bind(this);
    this.checkOut = this.checkOut.bind(this);
    this.getHistory = this.getHistory.bind(this);
    this.getTodaysRecord = this.getTodaysRecord.bind(this);
    this.getBalanceHistory = this.getBalanceHistory.bind(this);
    this.deleteRecord = this.deleteRecord.bind(this);
    this.createManualRecord = this.createManualRecord.bind(this);
  }

  // --- Função Auxiliar Interna ---
  /**
   * Encontra o registro de ponto aberto mais recente para um funcionário no dia atual.
   * Retorna o registro encontrado ou null.
   */
  async _findOpenRecordToday(employeeId) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayStart.getDate() + 1);

    try {
      return await TimeRecord.findOne({
        where: {
          employeeId: employeeId,
          startTime: { [Op.gte]: todayStart, [Op.lt]: todayEnd },
          endTime: null // Apenas registros sem check-out
        },
        order: [['startTime', 'DESC']] // Pega o mais recente
      });
    } catch (error) {
      logger.error(`Erro ao buscar registro aberto para employeeId ${employeeId}:`, error);
      throw error; // Re-lança o erro
    }
  }

  // --- Métodos do Controller (Handlers de Rota) ---

  /**
   * @route POST /api/time-records/check-in
   * @description Registra o início do expediente para o usuário autenticado.
   */
  async checkIn(req, res) {
    const employeeId = req.user.id; // ID do usuário do token
    try {
      // Verifica se já existe registro aberto hoje
      const existingRecord = await this._findOpenRecordToday(employeeId);
      if (existingRecord) {
        logger.warn(`Tentativa de check-in duplicado para employeeId ${employeeId}`);
        return sendResponse(res, 409, 'Já existe um check-in aberto para hoje.', { record: existingRecord });
      }
      // Cria o novo registro
      const newRecord = await TimeRecord.create({
        employeeId: employeeId,
        startTime: new Date()
      });
      logger.info(`Check-in registrado para employeeId ${employeeId} (Record ID: ${newRecord.id})`);
      sendResponse(res, 201, 'Check-in registrado com sucesso.', newRecord);
    } catch (error) {
      logger.error(`Erro no check-in para employeeId ${employeeId}:`, error);
      if (error.name === 'SequelizeValidationError') {
        const messages = error.errors.map(e => `${e.path}: ${e.message}`).join('; ');
        return sendResponse(res, 400, `Erro de validação ao criar registro: ${messages}`);
      }
      sendResponse(res, 500, 'Erro interno no servidor ao registrar check-in.');
    }
  }

  /**
   * @route POST /api/time-records/lunch-start
   * @description Registra o início do intervalo de almoço.
   */
  async startLunch(req, res) {
    const employeeId = req.user.id;
    try {
      const record = await this._findOpenRecordToday(employeeId); // Encontra registro aberto
      if (!record) return sendResponse(res, 404, 'Check-in não encontrado ou já finalizado.');
      if (record.lunchStartTime) return sendResponse(res, 409, 'Saída para almoço já registrada.');
      if (record.endTime) return sendResponse(res, 400, 'Não é possível registrar almoço após o check-out.');

      record.lunchStartTime = new Date();
      await record.save(); // Salva apenas a hora do almoço
      logger.info(`Início do almoço registrado para employeeId ${employeeId} (Record ID: ${record.id})`);
      sendResponse(res, 200, 'Início do almoço registrado.', record);
    } catch (error) {
      logger.error(`Erro ao registrar início do almoço (Employee ${employeeId}):`, error);
      sendResponse(res, 500, 'Erro interno ao registrar início do almoço.');
    }
  }

  /**
   * @route POST /api/time-records/lunch-end
   * @description Registra o fim do intervalo de almoço.
   */
  async endLunch(req, res) {
    const employeeId = req.user.id;
    try {
      const record = await this._findOpenRecordToday(employeeId);
      if (!record) return sendResponse(res, 404, 'Check-in não encontrado ou já finalizado.');
      if (!record.lunchStartTime) return sendResponse(res, 400, 'Registre a saída para o almoço primeiro.');
      if (record.lunchEndTime) return sendResponse(res, 409, 'Retorno do almoço já registrado.');
      if (record.endTime) return sendResponse(res, 400, 'Não é possível registrar retorno do almoço após o check-out.');

      record.lunchEndTime = new Date();
      if (record.lunchEndTime <= record.lunchStartTime) {
        return sendResponse(res, 400, 'Horário de retorno do almoço deve ser posterior à saída.');
      }
      await record.save(); // Salva apenas a hora do almoço
      logger.info(`Retorno do almoço registrado para employeeId ${employeeId} (Record ID: ${record.id})`);
      sendResponse(res, 200, 'Retorno do almoço registrado.', record);
    } catch (error) {
      logger.error(`Erro ao registrar retorno do almoço (Employee ${employeeId}):`, error);
      sendResponse(res, 500, 'Erro interno ao registrar retorno do almoço.');
    }
  }

  /**
   * @route POST /api/time-records/check-out
   * @description Registra o fim do expediente, calcula horas totais e ATUALIZA O SALDO ACUMULADO.
   */
  async checkOut(req, res) {
    const employeeId = req.user.id;
    const transaction = await sequelize.transaction();
    try {
      const record = await this._findOpenRecordToday(employeeId);
      if (!record) { await transaction.rollback(); return sendResponse(res, 404, 'Nenhum check-in aberto encontrado.'); }
      record.endTime = new Date();
      if (record.endTime <= record.startTime || (record.lunchEndTime && record.endTime <= record.lunchEndTime)) {
        await transaction.rollback(); return sendResponse(res, 400, 'Horário de check-out inválido.');
      }
      // TODO: Adicionar regra de negócio se almoço for obrigatório?

      await record.save({ transaction }); // Hook calcula totalHours
      logger.info(`Check-out salvo para Employee ${employeeId}. Record ID: ${record.id}, Horas: ${record.totalHours}`);

      // Calcula o saldo apenas deste dia e o adiciona ao acumulado
      const dailyBalance = await BalanceService.calculateDailyBalanceForDate(employeeId, record.startTime, transaction);
      logger.info(`Saldo do dia ${record.startTime.toISOString().split('T')[0]} calculado: ${dailyBalance}h. Atualizando saldo acumulado...`);
      const balanceUpdated = await BalanceService.updateAccumulatedBalance(employeeId, dailyBalance, transaction);

      if (!balanceUpdated) {
        logger.error(`Falha ao ATUALIZAR saldo acumulado após check-out para Employee ${employeeId}. Ponto salvo, mas saldo inconsistente.`);
        // Não reverte, mas loga o erro. Job diário pode corrigir.
      } else {
        logger.info(`Saldo acumulado atualizado para Employee ${employeeId} após check-out.`);
      }

      await transaction.commit();
      sendResponse(res, 200, 'Check-out registrado e saldo atualizado.', record);

    } catch (error) {
      if (transaction && !transaction.finished) await transaction.rollback();
      logger.error(`Erro no check-out (Employee ${employeeId}):`, error);
      sendResponse(res, 500, 'Erro interno no servidor ao registrar check-out.');
    }
  }

  /**
   * @route GET /api/time-records/employee/:employeeId
   * @description Busca o histórico SIMPLES de registros de ponto.
   */
  async getHistory(req, res) {
    const requestedEmployeeId = parseInt(req.params.employeeId, 10);
    const { id: loggedInUserId, role: loggedInUserRole } = req.user;
    try {
      if (isNaN(requestedEmployeeId)) return sendResponse(res, 400, 'ID do funcionário inválido.');
      if (loggedInUserRole !== 'admin' && loggedInUserId !== requestedEmployeeId) { return sendResponse(res, 403, 'Acesso negado.'); }
      const records = await TimeRecord.findAll({ where: { employeeId: requestedEmployeeId }, order: [['startTime', 'DESC']] });
      sendResponse(res, 200, 'Histórico de registros recuperado.', records);
    } catch (error) {
      logger.error(`Erro ao buscar histórico simples (Employee ${requestedEmployeeId}):`, error);
      sendResponse(res, 500, 'Erro interno ao buscar histórico.');
    }
  }

  /**
   * @route GET /api/time-records/today
   * @description Busca o registro de ponto (aberto ou fechado) de HOJE para o usuário logado.
   */
  async getTodaysRecord(req, res) {
    const employeeId = req.user.id;
    try {
      const openRecord = await this._findOpenRecordToday(employeeId);
      if (openRecord) { return sendResponse(res, 200, 'Registro de hoje encontrado (em andamento).', openRecord); }
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0); const todayEnd = new Date(todayStart); todayEnd.setDate(todayStart.getDate() + 1);
      const closedRecord = await TimeRecord.findOne({ where: { employeeId: employeeId, startTime: { [Op.gte]: todayStart, [Op.lt]: todayEnd }, endTime: { [Op.ne]: null } }, order: [['startTime', 'DESC']] });
      if (closedRecord) { return sendResponse(res, 200, 'Registro de hoje encontrado (já finalizado).', closedRecord); }
      return sendResponse(res, 404, 'Nenhum registro de ponto encontrado para hoje.');
    } catch (error) {
      logger.error(`Erro ao buscar registro de hoje para employeeId ${employeeId}: ${error.message}`, { stack: error.stack });
      sendResponse(res, 500, 'Erro interno ao buscar registro de hoje.');
    }
  }

  /**
   * @route GET /api/time-records/employee/:employeeId/balance-history?startDate=...&endDate=...
   * @description Busca o histórico de registros com cálculo de saldo para um período.
   */
  async getBalanceHistory(req, res) {
    const requestedEmployeeId = parseInt(req.params.employeeId, 10);
    const { id: loggedInUserId, role: loggedInUserRole } = req.user;
    const { startDate: startDateStr, endDate: endDateStr } = req.query;
    try {
      if (isNaN(requestedEmployeeId)) return sendResponse(res, 400, 'ID do funcionário inválido.');
      if (loggedInUserRole !== 'admin' && loggedInUserId !== requestedEmployeeId) { return sendResponse(res, 403, 'Acesso negado.'); }
      let startDate, endDate; const defaultEndDate = new Date(); const defaultStartDate = new Date(defaultEndDate); defaultStartDate.setDate(defaultEndDate.getDate() - 30);
      try { startDate = startDateStr ? new Date(startDateStr + 'T00:00:00Z') : defaultStartDate; endDate = endDateStr ? new Date(endDateStr + 'T23:59:59Z') : defaultEndDate; if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) throw new Error('Formato inválido.'); if (startDate > endDate) throw new Error('Data inicial maior que final.'); } catch (dateError) { return sendResponse(res, 400, dateError.message); }
      // Chama o serviço que agora inclui o ID do registro
      const history = await BalanceService.getBalanceHistory(requestedEmployeeId, startDate, endDate);
      sendResponse(res, 200, 'Histórico de saldo recuperado.', history);
    } catch (error) {
      logger.error(`Erro ao buscar histórico de saldo (Employee ${requestedEmployeeId}):`, error);
      if (error.message === "Funcionário não encontrado.") { return sendResponse(res, 404, error.message); }
      sendResponse(res, 500, 'Erro interno ao buscar histórico de saldo.');
    }
  }

  // --- NOVOS MÉTODOS ADMINISTRATIVOS ---

  /**
   * @route DELETE /api/time-records/:recordId
   * @description Remove um registro e AJUSTA O SALDO ACUMULADO. Acesso: Admin.
   */
  async deleteRecord(req, res) {
    const { recordId } = req.params;
    const adminUserId = req.user.id;
    const transaction = await sequelize.transaction();
    try {
      logger.info(`[Admin Action] Tentativa de remover registro ID ${recordId} por Admin ID ${adminUserId}.`);
      const record = await TimeRecord.findByPk(recordId, { transaction });
      if (!record) { await transaction.rollback(); return sendResponse(res, 404, 'Registro de ponto não encontrado.'); }

      const employeeIdAffected = record.employeeId;
      let balanceToRemove = 0;

      // Calcula o saldo que este registro representava ANTES de deletar
      if (record.endTime) { // Só recalcula se estava finalizado
        const employee = await Employee.findByPk(employeeIdAffected, { attributes: ['weeklyHours'], transaction });
        if (employee) { balanceToRemove = BalanceService.calculateDailyBalance(record, employee) ?? 0; }
      }
      balanceToRemove = parseFloat(balanceToRemove.toFixed(2));
      logger.info(`[Admin Action] Registro ${recordId} a ser removido tinha saldo diário de ${balanceToRemove}h.`);

      // Remove o registro
      await record.destroy({ transaction });
      logger.info(`[Admin Action] Registro ID ${recordId} removido.`);

      // SUBTRAI o saldo do registro deletado do acumulado
      if (balanceToRemove !== 0) {
        logger.info(`Ajustando saldo acumulado para Employee ${employeeIdAffected} por -${balanceToRemove}h.`);
        const balanceUpdated = await BalanceService.updateAccumulatedBalance(employeeIdAffected, -balanceToRemove, transaction); // Passa valor NEGATIVO
        if (!balanceUpdated) {
          logger.error(`Falha ao AJUSTAR saldo acumulado após deleção do registro ${recordId}. Revertendo.`);
          await transaction.rollback();
          return sendResponse(res, 500, 'Erro ao ajustar saldo acumulado após remover registro.');
        } else {
          logger.info(`Saldo acumulado ajustado para Employee ${employeeIdAffected} após deleção.`);
        }
      } else {
        logger.info(`[Admin Action] Registro ${recordId} não estava finalizado ou saldo era zero. Saldo acumulado não alterado.`);
      }

      await transaction.commit();
      sendResponse(res, 200, 'Registro de ponto removido e saldo ajustado.');

    } catch (error) {
      if (transaction && !transaction.finished) await transaction.rollback();
      logger.error(`[Admin Action] Erro ao remover registro ID ${recordId} por Admin ID ${adminUserId}:`, error);
      sendResponse(res, 500, 'Erro interno ao remover registro de ponto.');
    }
  }

  /**
   * @route POST /api/time-records/manual
   * @description Cria um registro manual e ATUALIZA O SALDO ACUMULADO. Acesso: Admin.
   */
  async createManualRecord(req, res) {
    const adminUserId = req.user.id;
    const { employeeId, date, startTime, endTime, lunchStartTime, lunchEndTime, reason } = req.body;
    const transaction = await sequelize.transaction();

    logger.info(`[Admin Action] Tentativa de criar registro manual para Employee ${employeeId} por Admin ${adminUserId}. Data: ${date}`);
    if (!employeeId || !date || !startTime || !endTime) { await transaction.rollback(); return sendResponse(res, 400, 'Campos obrigatórios ausentes.'); }

    try {
      const employee = await Employee.findByPk(employeeId, { attributes: ['id', 'weeklyHours'], transaction }); // Pega weeklyHours para calcular saldo
      if (!employee) { await transaction.rollback(); return sendResponse(res, 404, 'Funcionário não encontrado.'); }

      let startDateTime, endDateTime, lunchStartDateTime = null, lunchEndDateTime = null;
      try { // Parse e validação de datas/horas
        startDateTime = new Date(`${date}T${startTime}`); endDateTime = new Date(`${date}T${endTime}`);
        if (lunchStartTime) lunchStartDateTime = new Date(`${date}T${lunchStartTime}`); if (lunchEndTime) lunchEndDateTime = new Date(`${date}T${lunchEndTime}`);
        if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime()) || (lunchStartDateTime && isNaN(lunchStartDateTime.getTime())) || (lunchEndDateTime && isNaN(lunchEndDateTime.getTime()))) { throw new Error('Formato inválido.'); }
        if (endDateTime <= startDateTime) throw new Error('Fim antes do início.'); if (lunchStartDateTime && lunchEndDateTime && lunchEndDateTime <= lunchStartDateTime) throw new Error('Fim almoço antes início almoço.'); if (lunchStartDateTime && lunchStartDateTime <= startDateTime) throw new Error('Início almoço antes entrada.'); if (lunchEndDateTime && endDateTime <= lunchEndDateTime) throw new Error('Fim expediente antes fim almoço.');
      } catch (parseError) { await transaction.rollback(); logger.warn(`[Admin Action] Erro validação data/hora manual: ${parseError.message}`, req.body); return sendResponse(res, 400, parseError.message); }

      // Cria o registro na transação (Hook calcula totalHours)
      const newRecord = await TimeRecord.create({ employeeId, startTime: startDateTime, endTime: endDateTime, lunchStartTime: lunchStartDateTime, lunchEndTime: lunchEndDateTime, /*... auditoria ...*/ }, { transaction });
      logger.info(`[Admin Action] Registro manual criado (ID: ${newRecord.id}) para Funcionário ID ${employeeId}. Horas: ${newRecord.totalHours}`);

      // Calcula o saldo DESTE DIA (usando os dados do registro recém-criado e do funcionário)
      const dailyBalance = BalanceService.calculateDailyBalance(newRecord, employee) ?? 0; // Usa o método que recebe o registro
      logger.info(`Saldo do dia ${date} calculado: ${dailyBalance}h. Atualizando saldo acumulado...`);

      // Adiciona o saldo deste dia ao acumulado
      const balanceUpdated = await BalanceService.updateAccumulatedBalance(employeeId, dailyBalance, transaction);

      if (!balanceUpdated) {
        logger.error(`Falha ao ATUALIZAR saldo acumulado após criação manual do registro ${newRecord.id}. Revertendo.`);
        await transaction.rollback();
        return sendResponse(res, 500, 'Erro ao atualizar saldo acumulado após criar registro.');
      } else {
        logger.info(`Saldo acumulado atualizado para Employee ${employeeId} após criação manual.`);
      }

      await transaction.commit();
      sendResponse(res, 201, 'Registro manual criado e saldo atualizado.', newRecord);

    } catch (error) {
      if (transaction && !transaction.finished) await transaction.rollback();
      logger.error(`[Admin Action] Erro ao criar registro manual para Employee ${employeeId}:`, error);
      if (error.name === 'SequelizeValidationError') { return sendResponse(res, 400, `Erro de validação: ${error.errors.map(e => e.message).join('; ')}`); }
      sendResponse(res, 500, 'Erro interno ao criar registro manual.');
    }
  }
}

// Exporta a instância do controller
module.exports = new TimeRecordController();