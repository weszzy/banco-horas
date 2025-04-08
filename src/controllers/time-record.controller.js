// src/controllers/time-record.controller.js
const { TimeRecord } = require('../models/time-record.model'); // Modelo de Registro
const { Employee } = require('../models/employee.model'); // Modelo de Funcionário
const BalanceService = require('../services/balance.service'); // Serviço de cálculo de saldo
const { sendResponse } = require('../utils/response.util'); // Helper de resposta
const logger = require('../utils/logger.util'); // Logger
const { Op } = require('sequelize'); // Operadores Sequelize

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
     * @route DELETE /api/time-records/:recordId
     * @description Remove um registro de ponto específico. Acesso: Admin.
     * @param {object} req - req.params.recordId, req.user (admin)
     * @param {object} res
     */
  async deleteRecord(req, res) {
    const { recordId } = req.params;
    const adminUserId = req.user.id; // ID do admin que está fazendo a ação

    try {
      const record = await TimeRecord.findByPk(recordId);
      if (!record) {
        return sendResponse(res, 404, 'Registro de ponto não encontrado.');
      }

      const employeeIdAffected = record.employeeId; // Guarda o ID do funcionário afetado
      const dateAffected = record.startTime; // Guarda a data afetada

      // Efetua a remoção
      await record.destroy();

      logger.info(`[Admin Action] Registro de ponto ID ${recordId} (Funcionário ID ${employeeIdAffected}) removido pelo Admin ID ${adminUserId}.`);

      // **Importante: Recalcular saldo**
      // A maneira mais simples é forçar um recálculo para o dia/funcionário,
      // mas isso pode ser complexo de implementar síncronamente aqui.
      // Uma abordagem mais simples (mas menos precisa imediatamente) é deixar
      // o job diário corrigir ou fornecer um botão/ferramenta para recalcular.
      // Por ora, apenas retornamos sucesso na exclusão.
      // TODO: Implementar lógica de recálculo de saldo após exclusão.

      sendResponse(res, 200, 'Registro de ponto removido com sucesso.');

    } catch (error) {
      logger.error(`[Admin Action] Erro ao remover registro ID ${recordId} pelo Admin ID ${adminUserId}:`, error);
      sendResponse(res, 500, 'Erro interno ao remover registro de ponto.');
    }
  }

  /**
   * @route POST /api/time-records/manual
   * @description Cria um registro de ponto manualmente para um funcionário. Acesso: Admin.
   * @param {object} req - req.body { employeeId, date, startTime, endTime, lunchStartTime?, lunchEndTime? }, req.user (admin)
   * @param {object} res
   */
  async createManualRecord(req, res) {
    const adminUserId = req.user.id;
    // Extrai e valida dados do corpo da requisição
    const { employeeId, date, startTime, endTime, lunchStartTime, lunchEndTime } = req.body;

    // Validação básica de entrada
    if (!employeeId || !date || !startTime || !endTime) {
      return sendResponse(res, 400, 'Campos obrigatórios ausentes: employeeId, date, startTime, endTime.');
    }

    try {
      // Verifica se funcionário existe e está ativo
      const employee = await Employee.findByPk(employeeId);
      if (!employee) return sendResponse(res, 404, 'Funcionário não encontrado.');
      // if (!employee.isActive) return sendResponse(res, 400, 'Funcionário está inativo.'); // Opcional

      // Parseia e combina data com horários (MUITO CUIDADO COM FUSO HORÁRIO!)
      // Assume que date é 'YYYY-MM-DD' e times são 'HH:MM' ou 'HH:MM:SS'
      // Esta lógica assume que os horários estão no fuso horário LOCAL do servidor.
      // Para robustez, considere usar UTC ou bibliotecas como date-fns-tz/Moment Timezone.
      const startDateTime = new Date(`${date}T${startTime}`);
      const endDateTime = new Date(`${date}T${endTime}`);
      const lunchStartDateTime = lunchStartTime ? new Date(`${date}T${lunchStartTime}`) : null;
      const lunchEndDateTime = lunchEndTime ? new Date(`${date}T${lunchEndTime}`) : null;

      // Validações de Data/Hora
      if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
        return sendResponse(res, 400, 'Formato de data ou horário inválido (use YYYY-MM-DD e HH:MM[:SS]).');
      }
      if (lunchStartDateTime && isNaN(lunchStartDateTime.getTime())) return sendResponse(res, 400, 'Formato de horário inválido para início do almoço.');
      if (lunchEndDateTime && isNaN(lunchEndDateTime.getTime())) return sendResponse(res, 400, 'Formato de horário inválido para fim do almoço.');
      if (endDateTime <= startDateTime) return sendResponse(res, 400, 'Horário final deve ser após o horário inicial.');
      if (lunchStartDateTime && lunchEndDateTime && lunchEndDateTime <= lunchStartDateTime) return sendResponse(res, 400, 'Retorno do almoço deve ser após a saída.');
      if (lunchStartDateTime && lunchStartDateTime <= startDateTime) return sendResponse(res, 400, 'Saída para almoço deve ser após a entrada.');
      if (lunchEndDateTime && endDateTime <= lunchEndDateTime) return sendResponse(res, 400, 'Saída final deve ser após o retorno do almoço.');

      // TODO: Verificar se já existe registro conflitante para este dia/funcionário?

      // Cria o registro manual
      const newRecord = await TimeRecord.create({
        employeeId,
        startTime: startDateTime,
        endTime: endDateTime,
        lunchStartTime: lunchStartDateTime,
        lunchEndTime: lunchEndDateTime,
        // O hook beforeSave calculará totalHours
        // Adicionar campos de auditoria se existirem no modelo
        // edited_by_admin_id: adminUserId,
        // edit_reason: req.body.reason || 'Criação manual pelo administrador'
      });

      logger.info(`[Admin Action] Registro manual criado (ID: ${newRecord.id}) para Funcionário ID ${employeeId} pelo Admin ID ${adminUserId}.`);

      // **Importante: Recalcular saldo**
      // TODO: Implementar lógica de recálculo de saldo após adição manual.
      // await BalanceService.updateEmployeeBalanceForDate(employeeId, startDateTime); // Tentar recalcular

      sendResponse(res, 201, 'Registro manual criado com sucesso.', newRecord);

    } catch (error) {
      logger.error(`[Admin Action] Erro ao criar registro manual para Employee ${employeeId} pelo Admin ID ${adminUserId}:`, error);
      if (error.name === 'SequelizeValidationError') {
        const messages = error.errors.map(e => `${e.path}: ${e.message}`).join('; ');
        return sendResponse(res, 400, `Erro de validação: ${messages}`);
      }
      sendResponse(res, 500, 'Erro interno ao criar registro manual.');
    }
  }





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
      // Retorna 409 Conflict, útil para o frontend saber o estado
      return sendResponse(res, 409, 'Já existe um check-in aberto para hoje.', { record: existingRecord });
    }
    // Cria o novo registro
    const newRecord = await TimeRecord.create({
      employeeId: employeeId,
      startTime: new Date()
      // Validações corrigidas no modelo permitem null/undefined para outros campos
    });
    logger.info(`Check-in registrado para employeeId ${employeeId} (Record ID: ${newRecord.id})`);
    sendResponse(res, 201, 'Check-in registrado com sucesso.', newRecord); // 201 Created
  } catch (error) {
    logger.error(`Erro no check-in para employeeId ${employeeId}:`, error);
    // Verifica se foi erro de validação (embora corrigido, é bom manter)
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
    await record.save();
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
    await record.save();
    logger.info(`Retorno do almoço registrado para employeeId ${employeeId} (Record ID: ${record.id})`);
    sendResponse(res, 200, 'Retorno do almoço registrado.', record);
  } catch (error) {
    logger.error(`Erro ao registrar retorno do almoço (Employee ${employeeId}):`, error);
    sendResponse(res, 500, 'Erro interno ao registrar retorno do almoço.');
  }
}

  /**
   * @route POST /api/time-records/check-out
   * @description Registra o fim do expediente e calcula horas totais.
   */
  async checkOut(req, res) {
  const employeeId = req.user.id;
  try {
    const record = await this._findOpenRecordToday(employeeId);
    if (!record) return sendResponse(res, 404, 'Nenhum check-in aberto encontrado para fazer check-out.');
    // if (record.endTime) return sendResponse(res, 409, 'Check-out já realizado.'); // Redundante com _findOpenRecordToday

    // TODO: Adicionar regra de negócio se almoço for obrigatório?
    // if (employeeRequiresLunch && (!record.lunchStartTime || !record.lunchEndTime)) {
    //    return sendResponse(res, 400, 'Registre saída e retorno do almoço antes do check-out.');
    // }

    record.endTime = new Date();
    if (record.endTime <= record.startTime) return sendResponse(res, 400, 'Check-out deve ser posterior ao check-in.');
    if (record.lunchEndTime && record.endTime <= record.lunchEndTime) return sendResponse(res, 400, 'Check-out deve ser posterior ao retorno do almoço.');

    await record.save(); // Hook beforeSave no modelo calculará totalHours
    logger.info(`Check-out registrado para employeeId ${employeeId} (Record ID: ${record.id}). Horas: ${record.totalHours}`);
    // Retorna o registro completo com horas calculadas
    sendResponse(res, 200, 'Check-out registrado com sucesso.', record);
  } catch (error) {
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
  const { id: loggedInUserId, role: loggedInUserRole } = req.user; // Desestruturação
  try {
    if (isNaN(requestedEmployeeId)) return sendResponse(res, 400, 'ID do funcionário inválido.');
    // Valida permissão
    if (loggedInUserRole !== 'admin' && loggedInUserId !== requestedEmployeeId) {
      return sendResponse(res, 403, 'Acesso negado.');
    }
    // Busca registros ordenados
    const records = await TimeRecord.findAll({
      where: { employeeId: requestedEmployeeId },
      order: [['startTime', 'DESC']],
      // attributes: [...] // Pode selecionar campos específicos se necessário
    });
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
    // Tenta encontrar registro aberto primeiro
    const openRecord = await this._findOpenRecordToday(employeeId);
    if (openRecord) {
      return sendResponse(res, 200, 'Registro de hoje encontrado (em andamento).', openRecord);
    }
    // Se não houver aberto, procura por um fechado hoje
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart); todayEnd.setDate(todayStart.getDate() + 1);
    const closedRecord = await TimeRecord.findOne({
      where: {
        employeeId: employeeId,
        startTime: { [Op.gte]: todayStart, [Op.lt]: todayEnd },
        endTime: { [Op.ne]: null } // Que tenha endTime
      },
      order: [['startTime', 'DESC']] // Pega o último do dia se houver mais de um
    });
    if (closedRecord) {
      return sendResponse(res, 200, 'Registro de hoje encontrado (já finalizado).', closedRecord);
    }
    // Se não encontrou nem aberto nem fechado
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
    // Validações ID e Permissão
    if (isNaN(requestedEmployeeId)) return sendResponse(res, 400, 'ID do funcionário inválido.');
    if (loggedInUserRole !== 'admin' && loggedInUserId !== requestedEmployeeId) {
      return sendResponse(res, 403, 'Acesso negado.');
    }

    // Valida e Parseia Datas (com defaults)
    let startDate, endDate;
    const defaultEndDate = new Date(); // Hoje
    const defaultStartDate = new Date(defaultEndDate);
    defaultStartDate.setDate(defaultEndDate.getDate() - 30); // 30 dias atrás

    try {
      startDate = startDateStr ? new Date(startDateStr + 'T00:00:00Z') : defaultStartDate;
      endDate = endDateStr ? new Date(endDateStr + 'T23:59:59Z') : defaultEndDate;
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) throw new Error('Formato de data inválido (use YYYY-MM-DD).');
      if (startDate > endDate) throw new Error('Data inicial não pode ser maior que a data final.');
    } catch (dateError) {
      return sendResponse(res, 400, dateError.message);
    }

    // Chama o Serviço para obter o histórico calculado
    // O serviço lida com a busca no DB e os cálculos diários
    const history = await BalanceService.getBalanceHistory(requestedEmployeeId, startDate, endDate);

    sendResponse(res, 200, 'Histórico de saldo recuperado.', history);

  } catch (error) {
    logger.error(`Erro ao buscar histórico de saldo (Employee ${requestedEmployeeId}):`, error);
    if (error.message === "Funcionário não encontrado.") {
      return sendResponse(res, 404, error.message);
    }
    sendResponse(res, 500, 'Erro interno ao buscar histórico de saldo.');
  }
}
}

// Exporta a instância do controller
module.exports = new TimeRecordController();