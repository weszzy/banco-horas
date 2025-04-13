// src/controllers/time-record.controller.js
const { TimeRecord } = require('../models/time-record.model'); // Modelo de Registro
const { Employee } = require('../models/employee.model'); // Modelo de Funcionário
const BalanceService = require('../services/balance.service'); // Serviço de cálculo de saldo
const { sendResponse } = require('../utils/response.util'); // Helper de resposta
const logger = require('../utils/logger.util'); // Logger
const { Op } = require('sequelize'); // Operadores Sequelize
const { sequelize } = require('../config/database'); // Instância do Sequelize para transações


/**
 * Controller responsável pelas operações relacionadas aos registros de ponto (TimeRecord).
 * Inclui check-in/out, almoço, consulta de histórico e operações administrativas.
 */


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

  /**
       * Função auxiliar interna para encontrar o registro de ponto mais recente
       * que ainda está "aberto" (sem endTime) para um funcionário no dia atual.
       * @param {number} employeeId - ID do funcionário.
       * @returns {Promise<TimeRecord|null>} A instância do TimeRecord encontrada ou null.
       * @throws {Error} Se ocorrer um erro na consulta ao banco.
       */


  async _findOpenRecordToday(employeeId) {
    // Define início e fim do dia atual
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayStart.getDate() + 1); // Próximo dia às 00:00

    try {
      // Busca um registro que:
      // 1. Pertence ao funcionário.
      // 2. Começou hoje (startTime entre todayStart e todayEnd).
      // 3. NÃO tem hora de fim (endTime IS NULL).
      // 4. Ordena pelo mais recente (caso raro de múltiplos abertos, pega o último).
      return await TimeRecord.findOne({
        where: {
          employeeId: employeeId,
          startTime: { [Op.gte]: todayStart, [Op.lt]: todayEnd },
          endTime: null // Chave para encontrar registros abertos
        },
        order: [['startTime', 'DESC']]
      });
    } catch (error) {
      logger.error(`Erro ao buscar registro aberto para employeeId ${employeeId}:`, error);
      throw error; // Re-lança para o chamador tratar
    }
  }

  // --- Métodos do Controller (Handlers de Rota) ---

  /**
      * @route POST /api/time-records/check-in
      * @description Registra o início do expediente (cria um novo TimeRecord).
      * Impede check-in duplicado no mesmo dia.
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
      sendResponse(res, 201, 'Check-in registrado com sucesso.', newRecord); // 201 Created
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
   * @description Finaliza o registro de ponto do dia:
   * 1. Define `endTime`.
   * 2. O hook `beforeSave` do TimeRecord calcula `totalHours`.
   * 3. Calcula o saldo APENAS DESTE DIA (`calculateDailyBalanceForDate`).
   * 4. Atualiza o saldo ACUMULADO do funcionário (`updateAccumulatedBalance`).
   * Utiliza uma TRANSAÇÃO para garantir que todas as operações (salvar ponto, atualizar saldo)
   * ocorram com sucesso ou sejam revertidas juntas.
   */


  async checkOut(req, res) {
    const employeeId = req.user.id;
    // Inicia a transação ANTES de qualquer operação no banco.
    const transaction = await sequelize.transaction();
    try {
      // Busca o registro aberto DENTRO da transação.
      const record = await this._findOpenRecordToday(employeeId /* , { transaction } */); // Passar transaction aqui é opcional para findOne, mas boa prática
      if (!record) {
        await transaction.rollback(); // Reverte a transação se não há o que finalizar.
        return sendResponse(res, 404, 'Nenhum check-in aberto encontrado.');
      }

      // Define a hora de fim.
      record.endTime = new Date();
      // Validações básicas de tempo (fim > início, fim > fim_almoço).
      if (record.endTime <= record.startTime || (record.lunchEndTime && record.endTime <= record.lunchEndTime)) {
        await transaction.rollback();
        return sendResponse(res, 400, 'Horário de check-out inválido.');
      }
      // TODO: Adicionar validação se o almoço é obrigatório e não foi registrado?

      // Salva o registro atualizado (com endTime) DENTRO da transação.
      // O hook `beforeSave` será executado aqui para calcular `totalHours`.
      await record.save({ transaction });
      logger.info(`Check-out salvo para Employee ${employeeId}. Record ID: ${record.id}, Horas Calculadas: ${record.totalHours}`);

      // --- Atualização do Saldo Acumulado ---
      // 1. Calcula o saldo líquido APENAS para o dia do registro que acabou de ser fechado.
      //    Passa a transação para garantir leitura consistente caso haja operações concorrentes (improvável aqui, mas seguro).
      const dailyBalance = await BalanceService.calculateDailyBalanceForDate(employeeId, record.startTime, transaction);
      logger.info(`Saldo do dia ${record.startTime.toISOString().split('T')[0]} (check-out) calculado: ${dailyBalance}h. Atualizando saldo acumulado...`);

      // 2. Adiciona (ou subtrai) o saldo do dia ao saldo acumulado do funcionário.
      //    Esta operação DEVE estar dentro da mesma transação.
      const balanceUpdated = await BalanceService.updateAccumulatedBalance(employeeId, dailyBalance, transaction);

      // Verifica se a atualização do saldo acumulado falhou.
      if (!balanceUpdated) {
        // Se falhou, a transação será revertida, mas logamos o erro específico.
        logger.error(`Falha ao ATUALIZAR saldo acumulado após check-out para Employee ${employeeId}. Operação será revertida.`);
        // Lança um erro para garantir que o catch abaixo reverta a transação.
        throw new Error('Falha ao atualizar saldo acumulado do funcionário.');
      } else {
        logger.info(`Saldo acumulado atualizado para Employee ${employeeId} após check-out.`);
      }

      // Se todas as operações foram bem-sucedidas, commita a transação.
      await transaction.commit();
      logger.info(`Transação de check-out commitada para Employee ${employeeId}, Record ID ${record.id}.`);
      sendResponse(res, 200, 'Check-out registrado e saldo atualizado com sucesso.', record);

    } catch (error) {
      // Se qualquer erro ocorrer DURANTE a transação, ela deve ser revertida.
      logger.error(`Erro durante check-out (Employee ${employeeId}). Revertendo transação. Erro:`, error);
      // Garante que o rollback seja chamado apenas se a transação não foi finalizada (commit ou rollback anterior)
      if (transaction && !transaction.finished) {
        await transaction.rollback();
        logger.info(`Transação de check-out revertida para Employee ${employeeId}.`);
      }
      // Envia a resposta de erro genérica.
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
    const employeeId = req.user.id; // Pega do token via middleware authenticate
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
    const adminUserId = req.user.id; // Para logging/auditoria
    // Inicia a transação
    const transaction = await sequelize.transaction();
    try {
      logger.info(`[Admin Action] Tentativa de remover registro ID ${recordId} por Admin ID ${adminUserId}.`);

      // Busca o registro a ser deletado DENTRO da transação
      const record = await TimeRecord.findByPk(recordId, { transaction });
      if (!record) {
        await transaction.rollback();
        return sendResponse(res, 404, 'Registro de ponto não encontrado.');
      }

      const employeeIdAffected = record.employeeId;
      let balanceToRemove = 0;

      // --- Cálculo do Impacto no Saldo ---
      // Calcula o saldo que este registro ESPECÍFICO gerou ANTES de deletá-lo.
      // Só faz sentido calcular se o registro estava finalizado (tinha endTime e totalHours).
      if (record.endTime && typeof record.totalHours === 'number') {
        // Precisa da carga horária do funcionário para calcular a meta do dia do registro.
        const employee = await Employee.findByPk(employeeIdAffected, { attributes: ['weeklyHours'], transaction });
        if (employee) {
          // Usa a função que calcula o saldo para UM registro.
          balanceToRemove = BalanceService.calculateDailyBalance(record, employee) ?? 0;
        } else {
          logger.warn(`[Admin Action] Funcionário ${employeeIdAffected} não encontrado ao tentar calcular saldo para remoção do registro ${recordId}. Saldo acumulado não será ajustado.`);
        }
      }
      balanceToRemove = parseFloat(balanceToRemove.toFixed(2)); // Garante arredondamento
      logger.info(`[Admin Action] Registro ${recordId} a ser removido (Employee ${employeeIdAffected}) tinha um saldo diário de ${balanceToRemove}h.`);


      if (record.endTime && typeof record.totalHours === 'number') {
        const employee = await Employee.findByPk(employeeIdAffected, { attributes: ['weeklyHours'], transaction });
        if (employee) {
          balanceToRemove = BalanceService.calculateDailyBalance(record, employee) ?? 0;
          // **** LOG ADICIONAL ****
          logger.debug(`[Admin Action Delete - Debug] Calculado balanceToRemove: ${balanceToRemove} para Record ID ${recordId}`);
          // **** FIM LOG ADICIONAL ****
        } else {
          logger.warn(`[Admin Action] Funcionário ${employeeIdAffected} não encontrado ao tentar calcular saldo para remoção do registro ${recordId}. Saldo acumulado não será ajustado.`);
          balanceToRemove = 0; // Garante que é zero se o funcionário não for encontrado
        }
      } else {
        // **** LOG ADICIONAL ****
        logger.debug(`[Admin Action Delete - Debug] Registro ${recordId} não finalizado ou sem totalHours. balanceToRemove será 0.`);
        // **** FIM LOG ADICIONAL ****
        balanceToRemove = 0;
      }
      balanceToRemove = parseFloat(balanceToRemove.toFixed(2));
      logger.info(`[Admin Action] Registro ${recordId} a ser removido (Employee ${employeeIdAffected}) tinha um saldo diário de ${balanceToRemove}h.`);

      // --- Remoção e Ajuste de Saldo ---
      // 1. Remove o registro do banco de dados DENTRO da transação.
      await record.destroy({ transaction });
      logger.info(`[Admin Action] Registro ID ${recordId} removido do banco.`);

      // 2. Se o registro removido tinha impacto no saldo (balanceToRemove != 0),
      //    AJUSTA o saldo acumulado do funcionário, SUBTRAINDO o valor calculado.
      if (balanceToRemove !== 0) {
        logger.info(`[Admin Action] Ajustando saldo acumulado para Employee ${employeeIdAffected} por ${-balanceToRemove}h (oposto do saldo do registro).`);
        // Passa o valor NEGATIVO do saldo do registro para subtrair do acumulado.
        const balanceUpdated = await BalanceService.updateAccumulatedBalance(employeeIdAffected, -balanceToRemove, transaction);
        if (!balanceUpdated) {
          // Se a atualização do saldo falhar, a transação será revertida.
          logger.error(`[Admin Action] Falha ao AJUSTAR saldo acumulado após deleção do registro ${recordId}. Operação será revertida.`);
          throw new Error('Falha ao ajustar saldo acumulado após remover registro.');
        } else {
          logger.info(`[Admin Action] Saldo acumulado ajustado para Employee ${employeeIdAffected} após deleção do registro ${recordId}.`);
        }
      } else {
        logger.info(`[Admin Action] Registro ${recordId} não estava finalizado ou saldo era zero. Saldo acumulado não alterado.`);
      }

      // Se chegou até aqui, todas as operações foram bem-sucedidas. Commita a transação.
      await transaction.commit();
      logger.info(`[Admin Action] Transação de remoção do registro ${recordId} commitada.`);
      sendResponse(res, 200, 'Registro de ponto removido e saldo ajustado com sucesso.');

    } catch (error) {
      // Captura qualquer erro durante o processo e reverte a transação.
      logger.error(`[Admin Action] Erro ao remover registro ID ${recordId} por Admin ID ${adminUserId}. Revertendo transação. Erro:`, error);
      if (transaction && !transaction.finished) {
        await transaction.rollback();
        logger.info(`[Admin Action] Transação de remoção do registro ${recordId} revertida.`);
      }
      // Envia a resposta de erro.
      sendResponse(res, 500, 'Erro interno ao remover registro de ponto.');
    }
  }

  /**
     * @route POST /api/time-records/manual
     * @description (Admin) Cria um registro de ponto manualmente com todas as horas fornecidas.
     * Calcula `totalHours` via hook, calcula o saldo do dia e atualiza o saldo acumulado. Usa transação.
     */
  async createManualRecord(req, res) {
    // ... (lógica existente com adição de comentários similar ao deleteRecord e checkOut, explicando a transação e o fluxo de atualização de saldo) ...
    const adminUserId = req.user.id;
    // Extrai dados, valida presença dos obrigatórios
    const { employeeId, date, startTime, endTime, lunchStartTime, lunchEndTime /*, reason? */ } = req.body;
    const transaction = await sequelize.transaction(); // Inicia transação

    logger.info(`[Admin Action] Tentativa de criar registro manual para Employee ${employeeId} por Admin ${adminUserId}. Data: ${date}`);
    if (!employeeId || !date || !startTime || !endTime) {
      // Não precisa reverter aqui pois a transação ainda não fez nada no DB
      return sendResponse(res, 400, 'Campos obrigatórios (employeeId, date, startTime, endTime) ausentes.');
    }

    try {
      // Busca funcionário para validar ID e pegar weeklyHours (necessário para calcular saldo)
      const employee = await Employee.findByPk(employeeId, { attributes: ['id', 'weeklyHours'], transaction });
      if (!employee) {
        await transaction.rollback();
        return sendResponse(res, 404, 'Funcionário não encontrado.');
      }

      // --- Parsing e Validação das Datas/Horas ---
      let startDateTime, endDateTime, lunchStartDateTime = null, lunchEndDateTime = null;
      try {
        // Concatena data e hora e cria objetos Date
        startDateTime = new Date(`${date}T${startTime}`);
        endDateTime = new Date(`${date}T${endTime}`);
        if (lunchStartTime) lunchStartDateTime = new Date(`${date}T${lunchStartTime}`);
        if (lunchEndTime) lunchEndDateTime = new Date(`${date}T${lunchEndTime}`);

        // Verifica se as datas são válidas
        if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime()) ||
          (lunchStartDateTime && isNaN(lunchStartDateTime.getTime())) ||
          (lunchEndDateTime && isNaN(lunchEndDateTime.getTime()))) {
          throw new Error('Formato de data/hora inválido.');
        }

        // Validações de consistência temporal
        if (endDateTime <= startDateTime) throw new Error('Hora de fim deve ser posterior à hora de início.');
        if (lunchStartDateTime && lunchEndDateTime && lunchEndDateTime <= lunchStartDateTime) throw new Error('Fim do almoço deve ser posterior ao início do almoço.');
        if (lunchStartDateTime && lunchStartDateTime <= startDateTime) throw new Error('Início do almoço não pode ser antes ou igual à entrada.');
        if (lunchEndDateTime && endDateTime <= lunchEndDateTime) throw new Error('Fim do expediente não pode ser antes ou igual ao fim do almoço.');
        // Adicionar mais validações se necessário (ex: almoço dentro do expediente)

      } catch (parseError) {
        // Se a validação falhar, reverte e retorna erro 400
        await transaction.rollback();
        logger.warn(`[Admin Action] Erro validação data/hora manual: ${parseError.message}`, req.body);
        return sendResponse(res, 400, `Erro na data/hora: ${parseError.message}`);
      }

      // --- Criação do Registro e Atualização de Saldo ---
      // 1. Cria o registro manual na transação. O hook beforeSave calculará totalHours.
      const newRecord = await TimeRecord.create({
        employeeId,
        startTime: startDateTime,
        endTime: endDateTime,
        lunchStartTime: lunchStartDateTime, // Será null se não fornecido
        lunchEndTime: lunchEndDateTime,   // Será null se não fornecido
        // TODO: Adicionar campos de auditoria? Ex: createdByAdminId: adminUserId, creationReason: reason
      }, { transaction });
      logger.info(`[Admin Action] Registro manual criado (ID: ${newRecord.id}) para Funcionário ID ${employeeId}. Horas Calculadas: ${newRecord.totalHours}`);

      // 2. Calcula o saldo DESTE DIA específico usando o registro recém-criado.
      //    Passa o registro e o funcionário (com weeklyHours) para a função de cálculo.
      const dailyBalance = BalanceService.calculateDailyBalance(newRecord, employee) ?? 0;
      logger.info(`[Admin Action] Saldo do dia ${date} (registro manual ${newRecord.id}) calculado: ${dailyBalance}h. Atualizando saldo acumulado...`);

      // 3. Adiciona o saldo do dia ao saldo acumulado do funcionário na mesma transação.
      const balanceUpdated = await BalanceService.updateAccumulatedBalance(employeeId, dailyBalance, transaction);

      if (!balanceUpdated) {
        // Se a atualização do saldo falhar, reverte a transação.
        logger.error(`[Admin Action] Falha ao ATUALIZAR saldo acumulado após criação manual do registro ${newRecord.id}. Operação será revertida.`);
        throw new Error('Falha ao atualizar saldo acumulado após criar registro manual.');
      } else {
        logger.info(`[Admin Action] Saldo acumulado atualizado para Employee ${employeeId} após criação manual.`);
      }

      // Se tudo deu certo, commita a transação.
      await transaction.commit();
      logger.info(`[Admin Action] Transação de criação manual para registro ${newRecord.id} commitada.`);
      sendResponse(res, 201, 'Registro manual criado e saldo atualizado com sucesso.', newRecord); // 201 Created

    } catch (error) {
      // Captura erros da criação ou da atualização do saldo e reverte.
      logger.error(`[Admin Action] Erro ao criar registro manual para Employee ${employeeId}. Revertendo transação. Erro:`, error);
      if (transaction && !transaction.finished) {
        await transaction.rollback();
        logger.info(`[Admin Action] Transação de criação manual para Employee ${employeeId} revertida.`);
      }
      // Trata erros de validação do Sequelize separadamente
      if (error.name === 'SequelizeValidationError') {
        return sendResponse(res, 400, `Erro de validação: ${error.errors.map(e => e.message).join('; ')}`);
      }
      // Outros erros internos
      sendResponse(res, 500, 'Erro interno ao criar registro manual.');
    }
  }



  /**
     * @route PUT /api/time-records/:recordId
     * @description (Admin) Edita um registro de ponto existente.
     * Recalcula o impacto no saldo do dia e ajusta o saldo acumulado do funcionário.
     * Requer todos os campos de tempo (startTime, endTime, lunchStartTime?, lunchEndTime?) no body.
     * Utiliza transação para garantir atomicidade.
     */
  async updateRecord(req, res) {
    const { recordId } = req.params;
    const adminUserId = req.user.id;
    // Extrair novos tempos do corpo da requisição
    // Formato esperado: String 'YYYY-MM-DDTHH:MM:SS' ou similar que `new Date()` entenda.
    // Ou separar data e hora: { date: 'YYYY-MM-DD', startTime: 'HH:MM', ... }
    const { startTime, endTime, lunchStartTime, lunchEndTime /*, reason? */ } = req.body;

    logger.info(`[Admin Action] Tentativa de EDITAR registro ID ${recordId} por Admin ID ${adminUserId}.`);

    // --- Validação de Input (essencial) ---
    if (!startTime || !endTime) {
      return sendResponse(res, 400, 'Hora de início e fim são obrigatórias para editar.');
    }
    // Adicionar validação de formato/data aqui usando try/catch com `new Date()`
    // e validação de consistência (fim > inicio, etc.) como em `createManualRecord`.
    let startDateTime, endDateTime, lunchStartDateTime = null, lunchEndDateTime = null;
    try {
      // Exemplo (precisa adaptar se o formato de entrada for diferente):
      startDateTime = new Date(startTime);
      endDateTime = new Date(endTime);
      if (lunchStartTime) lunchStartDateTime = new Date(lunchStartTime);
      if (lunchEndTime) lunchEndDateTime = new Date(lunchEndTime);

      if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime()) ||
        (lunchStartDateTime && isNaN(lunchStartDateTime.getTime())) ||
        (lunchEndDateTime && isNaN(lunchEndDateTime.getTime()))) {
        throw new Error('Formato de data/hora inválido.');
      }
      // Adicionar validações de consistência (fim > inicio, etc.)
      if (endDateTime <= startDateTime) throw new Error('Hora de fim deve ser posterior à hora de início.');
      // ... outras validações ...

    } catch (validationError) {
      logger.warn(`[Admin Action Edit] Erro validação data/hora: ${validationError.message}`, req.body);
      return sendResponse(res, 400, `Erro na data/hora: ${validationError.message}`);
    }
    // --- Fim Validação ---


    const transaction = await sequelize.transaction();
    try {
      // 1. Buscar o registro e o funcionário associado DENTRO da transação.
      const record = await TimeRecord.findByPk(recordId, { transaction });
      if (!record) {
        await transaction.rollback();
        return sendResponse(res, 404, 'Registro de ponto não encontrado.');
      }
      const employee = await Employee.findByPk(record.employeeId, { attributes: ['id', 'weeklyHours', 'isActive'], transaction });
      if (!employee) {
        // Improvável se o registro existe, mas seguro verificar.
        await transaction.rollback();
        return sendResponse(res, 404, 'Funcionário associado ao registro não encontrado.');
      }
      if (!employee.isActive) {
        logger.warn(`[Admin Action Edit] Tentativa de editar registro ${recordId} de funcionário inativo (${employee.id}). Permitindo, mas atenção.`);
        // Decidir se permite editar registros de inativos. Se não, retornar erro aqui.
      }


      // 2. Calcular o saldo diário ANTES da modificação.
      //    Importante: Usar os dados DO REGISTRO ATUAL no banco.
      const oldDailyBalance = BalanceService.calculateDailyBalance(record, employee) ?? 0;
      logger.info(`[Admin Action Edit] Saldo diário ANTES da edição (Record ID ${recordId}): ${oldDailyBalance}h`);


      // 3. Atualizar os dados do registro com os novos valores.
      record.startTime = startDateTime;
      record.endTime = endDateTime;
      record.lunchStartTime = lunchStartDateTime; // Será null se não fornecido
      record.lunchEndTime = lunchEndDateTime;   // Será null se não fornecido
      // O campo `totalHours` será recalculado automaticamente pelo hook `beforeSave`.

      // 4. Salvar o registro modificado DENTRO da transação.
      await record.save({ transaction });
      logger.info(`[Admin Action Edit] Registro ID ${recordId} salvo com novos tempos. Novas horas totais: ${record.totalHours}`);


      // 5. Calcular o saldo diário DEPOIS da modificação.
      //    Usa o mesmo método, mas agora com os dados atualizados do `record`.
      const newDailyBalance = BalanceService.calculateDailyBalance(record, employee) ?? 0;
      logger.info(`[Admin Action Edit] Saldo diário DEPOIS da edição (Record ID ${recordId}): ${newDailyBalance}h`);


      // 6. Calcular o delta (diferença) a ser aplicado ao saldo acumulado.
      const balanceDelta = parseFloat((newDailyBalance - oldDailyBalance).toFixed(2));
      logger.info(`[Admin Action Edit] Delta de saldo a ser aplicado ao acumulado (Employee ${employee.id}): ${balanceDelta}h`);


      // 7. Se houver diferença, ajustar o saldo acumulado DENTRO da transação.
      if (balanceDelta !== 0) {
        const balanceUpdated = await BalanceService.updateAccumulatedBalance(employee.id, balanceDelta, transaction);
        if (!balanceUpdated) {
          logger.error(`[Admin Action Edit] Falha ao AJUSTAR saldo acumulado após edição do registro ${recordId}. Operação será revertida.`);
          throw new Error('Falha ao atualizar saldo acumulado após editar registro.');
        }
        logger.info(`[Admin Action Edit] Saldo acumulado ajustado para Employee ${employee.id} após edição do registro ${recordId}.`);
      } else {
        logger.info(`[Admin Action Edit] Edição do registro ${recordId} não resultou em mudança no saldo diário. Saldo acumulado não alterado.`);
      }


      // 8. Se tudo deu certo, commitar a transação.
      await transaction.commit();
      logger.info(`[Admin Action Edit] Transação de edição do registro ${recordId} commitada.`);
      // Retorna o registro atualizado
      sendResponse(res, 200, 'Registro de ponto atualizado com sucesso.', record);

    } catch (error) {
      logger.error(`[Admin Action Edit] Erro ao editar registro ID ${recordId}. Revertendo transação. Erro:`, error);
      if (transaction && !transaction.finished) {
        await transaction.rollback();
        logger.info(`[Admin Action Edit] Transação de edição do registro ${recordId} revertida.`);
      }
      if (error.name === 'SequelizeValidationError') {
        return sendResponse(res, 400, `Erro de validação: ${error.errors.map(e => e.message).join('; ')}`);
      }
      sendResponse(res, 500, 'Erro interno ao editar registro de ponto.');
    }
  }
}



// Exporta a instância do controller
module.exports = new TimeRecordController();