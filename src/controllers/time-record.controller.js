const { TimeRecord } = require('../models/time-record.model'); // Importa direto
const { Employee } = require('../models/employee.model'); // Importa direto
const { sendResponse } = require('../utils/response.util');
const logger = require('../utils/logger.util');
const { Op } = require('sequelize');

class TimeRecordController {

  // --- Adiciona o Construtor para fazer o Bind ---
  constructor() {
    // Vincula o 'this' de cada método que será usado como handler de rota
    // à instância da classe TimeRecordController.
    this.checkIn = this.checkIn.bind(this);
    this.startLunch = this.startLunch.bind(this);
    this.endLunch = this.endLunch.bind(this);
    this.checkOut = this.checkOut.bind(this);
    this.getHistory = this.getHistory.bind(this);
    this.getTodaysRecord = this.getTodaysRecord.bind(this);
    // A função auxiliar _findOpenRecordToday não precisa ser bindada
    // porque ela é chamada internamente usando 'this'.
  }

  // --- Função Auxiliar Interna ---
  async _findOpenRecordToday(employeeId) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayStart.getDate() + 1);

    try {
      // 'this' aqui dentro se refere à instância porque a chamada
      // veio de um método já bindado (ex: getTodaysRecord)
      return await TimeRecord.findOne({
        where: {
          employeeId: employeeId,
          startTime: { [Op.gte]: todayStart, [Op.lt]: todayEnd },
          endTime: null
        },
        order: [['startTime', 'DESC']]
      });
    } catch (error) {
      logger.error(`Erro ao buscar registro aberto para employeeId ${employeeId}:`, error);
      throw error;
    }
  }

  // --- Métodos do Controller (Rotas) ---

  async checkIn(req, res) {
    const employeeId = req.user.id;
    try {
      // 'this' aqui estará correto por causa do bind no construtor
      const existingRecord = await this._findOpenRecordToday(employeeId); // Chama método interno
      if (existingRecord) {
        logger.warn(`Tentativa de check-in duplicado para employeeId ${employeeId}`);
        return sendResponse(res, 409, 'Já existe um check-in aberto para hoje.', { record: existingRecord });
      }
      const newRecord = await TimeRecord.create({
        employeeId: employeeId,
        startTime: new Date()
      });
      logger.info(`Check-in registrado com sucesso para employeeId ${employeeId} (Record ID: ${newRecord.id})`);
      sendResponse(res, 201, 'Check-in registrado com sucesso.', newRecord);
    } catch (error) {
      logger.error(`Erro no check-in para employeeId ${employeeId}:`, error);
      sendResponse(res, 500, 'Erro interno no servidor ao registrar check-in.');
    }
  }

  async startLunch(req, res) {
    const employeeId = req.user.id;
    try {
      // 'this' aqui estará correto
      const record = await this._findOpenRecordToday(employeeId);
      if (!record) {
        return sendResponse(res, 404, 'Nenhum check-in aberto encontrado para registrar início do almoço.');
      }
      if (record.lunchStartTime) {
        return sendResponse(res, 409, 'Saída para almoço já registrada neste expediente.', { record });
      }
      if (record.endTime) {
        return sendResponse(res, 400, 'Não é possível registrar almoço após o check-out.');
      }
      record.lunchStartTime = new Date();
      await record.save();
      logger.info(`Início do almoço registrado para employeeId ${employeeId} (Record ID: ${record.id})`);
      sendResponse(res, 200, 'Início do almoço registrado.', record);
    } catch (error) {
      logger.error(`Erro ao registrar início do almoço para employeeId ${employeeId}:`, error);
      sendResponse(res, 500, 'Erro interno no servidor ao registrar início do almoço.');
    }
  }

  async endLunch(req, res) {
    const employeeId = req.user.id;
    try {
      // 'this' aqui estará correto
      const record = await this._findOpenRecordToday(employeeId);
      if (!record) {
        return sendResponse(res, 404, 'Nenhum check-in aberto encontrado para registrar retorno do almoço.');
      }
      if (!record.lunchStartTime) {
        return sendResponse(res, 400, 'Registre a saída para o almoço antes de registrar o retorno.');
      }
      if (record.lunchEndTime) {
        return sendResponse(res, 409, 'Retorno do almoço já registrado neste expediente.', { record });
      }
      if (record.endTime) {
        return sendResponse(res, 400, 'Não é possível registrar retorno do almoço após o check-out.');
      }
      record.lunchEndTime = new Date();
      if (record.lunchEndTime <= record.lunchStartTime) {
        logger.warn(`Retorno do almoço (${record.lunchEndTime}) é anterior ou igual à saída (${record.lunchStartTime}) para Record ID ${record.id}`);
        return sendResponse(res, 400, 'O horário de retorno do almoço deve ser posterior ao horário de saída.');
      }
      await record.save();
      logger.info(`Retorno do almoço registrado para employeeId ${employeeId} (Record ID: ${record.id})`);
      sendResponse(res, 200, 'Retorno do almoço registrado.', record);
    } catch (error) {
      logger.error(`Erro ao registrar retorno do almoço para employeeId ${employeeId}:`, error);
      sendResponse(res, 500, 'Erro interno no servidor ao registrar retorno do almoço.');
    }
  }

  async checkOut(req, res) {
    const employeeId = req.user.id;
    try {
      // 'this' aqui estará correto
      const record = await this._findOpenRecordToday(employeeId);
      if (!record) {
        return sendResponse(res, 404, 'Nenhum check-in aberto encontrado para fazer check-out.');
      }
      if (record.endTime) {
        return sendResponse(res, 409, 'Check-out já realizado para este expediente.', { record });
      }
      record.endTime = new Date();
      if (record.endTime <= record.startTime) {
        return sendResponse(res, 400, 'O horário de check-out deve ser posterior ao horário de check-in.');
      }
      if (record.lunchEndTime && record.endTime <= record.lunchEndTime) {
        return sendResponse(res, 400, 'O horário de check-out deve ser posterior ao retorno do almoço.');
      }
      await record.save(); // Hook calcula totalHours
      logger.info(`Check-out registrado com sucesso para employeeId ${employeeId} (Record ID: ${record.id}). Horas: ${record.totalHours}`);
      sendResponse(res, 200, 'Check-out registrado com sucesso.', record);
    } catch (error) {
      logger.error(`Erro no check-out para employeeId ${employeeId}:`, error);
      sendResponse(res, 500, 'Erro interno no servidor ao registrar check-out.');
    }
  }

  async getHistory(req, res) {
    const requestedEmployeeId = parseInt(req.params.employeeId, 10);
    const loggedInUserId = req.user.id;
    const loggedInUserRole = req.user.role;
    try {
      if (isNaN(requestedEmployeeId)) {
        return sendResponse(res, 400, 'ID do funcionário inválido.');
      }
      if (loggedInUserRole !== 'admin' && loggedInUserId !== requestedEmployeeId) {
        logger.warn(`Usuário ${loggedInUserId} (${loggedInUserRole}) tentou acessar histórico do funcionário ${requestedEmployeeId}`);
        return sendResponse(res, 403, 'Acesso negado. Você só pode visualizar seu próprio histórico.');
      }
      const records = await TimeRecord.findAll({
        where: { employeeId: requestedEmployeeId },
        order: [['startTime', 'DESC']],
      });
      sendResponse(res, 200, 'Histórico de registros recuperado com sucesso.', records);
    } catch (error) {
      logger.error(`Erro ao buscar histórico para employeeId ${requestedEmployeeId}:`, error);
      sendResponse(res, 500, 'Erro interno no servidor ao buscar histórico.');
    }
  }

  async getTodaysRecord(req, res) {
    const employeeId = req.user.id;
    try {
      // 'this' aqui estará correto por causa do bind no construtor
      const record = await this._findOpenRecordToday(employeeId); // Chama método interno
      if (!record) {
        const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(todayStart); todayEnd.setDate(todayStart.getDate() + 1);
        const closedRecord = await TimeRecord.findOne({
          where: {
            employeeId: employeeId,
            startTime: { [Op.gte]: todayStart, [Op.lt]: todayEnd },
            endTime: { [Op.ne]: null }
          },
          order: [['startTime', 'DESC']]
        });
        if (closedRecord) {
          sendResponse(res, 200, 'Registro de hoje encontrado (já finalizado).', closedRecord);
        } else {
          sendResponse(res, 404, 'Nenhum registro de ponto encontrado para hoje.');
        }
      } else {
        sendResponse(res, 200, 'Registro de hoje encontrado (em andamento).', record);
      }
    } catch (error) {
      // Adiciona o stack trace ao log para mais detalhes
      logger.error(`Erro ao buscar registro de hoje para employeeId ${employeeId}: ${error.message}`, { stack: error.stack });
      sendResponse(res, 500, 'Erro interno ao buscar registro de hoje.');
    }
  }
}

// Exporta a instância única, como antes
module.exports = new TimeRecordController();