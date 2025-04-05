const { TimeRecord, Employee } = require('../models'); // Assume que src/models/index.js exporta tudo
// Ou importe individualmente:
// const { TimeRecord } = require('../models/time-record.model');
// const { Employee } = require('../models/employee.model');

const { sendResponse } = require('../utils/response.util');
const logger = require('../utils/logger.util');
const { Op } = require('sequelize'); // Necessário para operadores como gte, lt, etc.

class TimeRecordController {

  // --- Função Auxiliar Interna ---
  /**
   * Encontra o registro de ponto aberto mais recente para um funcionário no dia atual.
   * Retorna o registro encontrado ou null.
   */
  async _findOpenRecordToday(employeeId) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0); // Início do dia atual

    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayStart.getDate() + 1); // Início do próximo dia

    try {
      return await TimeRecord.findOne({
        where: {
          employeeId: employeeId,
          startTime: {
            [Op.gte]: todayStart, // Maior ou igual ao início do dia
            [Op.lt]: todayEnd     // Menor que o início do próximo dia
          },
          endTime: null // Apenas registros que ainda não têm check-out
        },
        order: [['startTime', 'DESC']] // Pega o mais recente se houver múltiplos (não deveria acontecer)
      });
    } catch (error) {
      logger.error(`Erro ao buscar registro aberto para employeeId ${employeeId}:`, error);
      throw error; // Re-lança o erro para ser pego pelo catch do método chamador
    }
  }


  // --- Métodos do Controller (Rotas) ---

  /**
   * @route POST /api/time-records/check-in
   * @description Registra o início do expediente para o usuário autenticado.
   */
  async checkIn(req, res) {
    const employeeId = req.user.id; // ID do usuário logado (do token JWT via middleware authenticate)

    try {
      // 1. Verifica se já existe um registro aberto para hoje
      const existingRecord = await this._findOpenRecordToday(employeeId);
      if (existingRecord) {
        logger.warn(`Tentativa de check-in duplicado para employeeId ${employeeId}`);
        return sendResponse(res, 409, 'Já existe um check-in aberto para hoje.', { record: existingRecord }); // 409 Conflict
      }

      // 2. Cria o novo registro de ponto
      const newRecord = await TimeRecord.create({
        employeeId: employeeId,
        startTime: new Date() // Hora atual do servidor
        // lunchStartTime, lunchEndTime, endTime, totalHours serão null por padrão
      });

      logger.info(`Check-in registrado com sucesso para employeeId ${employeeId} (Record ID: ${newRecord.id})`);
      sendResponse(res, 201, 'Check-in registrado com sucesso.', newRecord);

    } catch (error) {
      logger.error(`Erro no check-in para employeeId ${employeeId}:`, error);
      sendResponse(res, 500, 'Erro interno no servidor ao registrar check-in.');
    }
  }

  /**
   * @route POST /api/time-records/lunch-start
   * @description Registra o início do intervalo de almoço para o registro aberto do dia.
   */
  async startLunch(req, res) {
    const employeeId = req.user.id;

    try {
      // 1. Encontra o registro aberto de hoje
      const record = await this._findOpenRecordToday(employeeId);
      if (!record) {
        return sendResponse(res, 404, 'Nenhum check-in aberto encontrado para registrar início do almoço.');
      }

      // 2. Verifica se o almoço já foi iniciado
      if (record.lunchStartTime) {
        return sendResponse(res, 409, 'Saída para almoço já registrada neste expediente.', { record }); // 409 Conflict
      }

      // 3. Verifica se o check-out já foi feito (embora _findOpenRecordToday já filtre isso)
      if (record.endTime) {
        return sendResponse(res, 400, 'Não é possível registrar almoço após o check-out.');
      }

      // 4. Registra a hora de início do almoço
      record.lunchStartTime = new Date();
      await record.save();

      logger.info(`Início do almoço registrado para employeeId ${employeeId} (Record ID: ${record.id})`);
      sendResponse(res, 200, 'Início do almoço registrado.', record);

    } catch (error) {
      logger.error(`Erro ao registrar início do almoço para employeeId ${employeeId}:`, error);
      sendResponse(res, 500, 'Erro interno no servidor ao registrar início do almoço.');
    }
  }

  /**
   * @route POST /api/time-records/lunch-end
   * @description Registra o fim do intervalo de almoço para o registro aberto do dia.
   */
  async endLunch(req, res) {
    const employeeId = req.user.id;

    try {
      // 1. Encontra o registro aberto de hoje
      const record = await this._findOpenRecordToday(employeeId);
      if (!record) {
        return sendResponse(res, 404, 'Nenhum check-in aberto encontrado para registrar retorno do almoço.');
      }

      // 2. Verifica se a saída para almoço foi registrada primeiro
      if (!record.lunchStartTime) {
        return sendResponse(res, 400, 'Registre a saída para o almoço antes de registrar o retorno.');
      }

      // 3. Verifica se o retorno do almoço já foi registrado
      if (record.lunchEndTime) {
        return sendResponse(res, 409, 'Retorno do almoço já registrado neste expediente.', { record }); // 409 Conflict
      }

      // 4. Verifica se o check-out já foi feito
      if (record.endTime) {
        return sendResponse(res, 400, 'Não é possível registrar retorno do almoço após o check-out.');
      }

      // 5. Registra a hora de fim do almoço
      record.lunchEndTime = new Date();

      // Garante que o fim do almoço seja depois do início
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

  /**
   * @route POST /api/time-records/check-out
   * @description Registra o fim do expediente para o registro aberto do dia. Calcula as horas totais.
   */
  async checkOut(req, res) {
    const employeeId = req.user.id;

    try {
      // 1. Encontra o registro aberto de hoje
      const record = await this._findOpenRecordToday(employeeId);
      if (!record) {
        return sendResponse(res, 404, 'Nenhum check-in aberto encontrado para fazer check-out.');
      }

      // 2. Verifica se o check-out já foi feito (redundante com _findOpenRecordToday, mas seguro)
      if (record.endTime) {
        return sendResponse(res, 409, 'Check-out já realizado para este expediente.', { record }); // 409 Conflict
      }

      // 3. Opcional: Exigir que o almoço tenha sido registrado (ida e volta)
      // Descomente se for uma regra de negócio obrigatória
      /*
      if (!record.lunchStartTime || !record.lunchEndTime) {
          logger.warn(`Tentativa de check-out sem registro completo de almoço para Record ID ${record.id}`);
          return sendResponse(res, 400, 'Registre a saída e o retorno do almoço antes de fazer o check-out.');
      }
      */

      // 4. Registra a hora de fim do expediente
      record.endTime = new Date();

      // Garante que o fim seja depois do início (e depois do almoço, se houver)
      if (record.endTime <= record.startTime) {
        return sendResponse(res, 400, 'O horário de check-out deve ser posterior ao horário de check-in.');
      }
      if (record.lunchEndTime && record.endTime <= record.lunchEndTime) {
        return sendResponse(res, 400, 'O horário de check-out deve ser posterior ao retorno do almoço.');
      }


      // 5. Salva o registro. O hook `beforeSave` no modelo calculará `totalHours`.
      await record.save();

      logger.info(`Check-out registrado com sucesso para employeeId ${employeeId} (Record ID: ${record.id}). Horas: ${record.totalHours}`);
      // Retorna o registro completo, incluindo as horas calculadas
      sendResponse(res, 200, 'Check-out registrado com sucesso.', record);

    } catch (error) {
      logger.error(`Erro no check-out para employeeId ${employeeId}:`, error);
      sendResponse(res, 500, 'Erro interno no servidor ao registrar check-out.');
    }
  }

  /**
   * @route GET /api/time-records/employee/:employeeId
   * @description Busca o histórico de registros de ponto para um funcionário específico.
   * @access Autenticado (Admin pode ver todos, funcionário só o seu)
   */
  async getHistory(req, res) {
    const requestedEmployeeId = parseInt(req.params.employeeId, 10); // ID do histórico solicitado
    const loggedInUserId = req.user.id;         // ID do usuário logado
    const loggedInUserRole = req.user.role;     // Papel do usuário logado

    try {
      // Validação de NaN após parseInt
      if (isNaN(requestedEmployeeId)) {
        return sendResponse(res, 400, 'ID do funcionário inválido.');
      }

      // 1. Verifica permissão: Admin pode ver qualquer histórico,
      //    usuário normal só pode ver o próprio histórico.
      if (loggedInUserRole !== 'admin' && loggedInUserId !== requestedEmployeeId) {
        logger.warn(`Usuário ${loggedInUserId} (${loggedInUserRole}) tentou acessar histórico do funcionário ${requestedEmployeeId}`);
        return sendResponse(res, 403, 'Acesso negado. Você só pode visualizar seu próprio histórico.');
      }

      // 2. Busca os registros do funcionário solicitado
      const records = await TimeRecord.findAll({
        where: { employeeId: requestedEmployeeId },
        order: [['startTime', 'DESC']], // Mais recentes primeiro
        // Opcional: incluir dados do funcionário (se necessário)
        // include: [{ model: Employee, as: 'employee', attributes: ['id', 'fullName'] }]
      });

      // Não é um erro se não houver registros, apenas retorna lista vazia
      sendResponse(res, 200, 'Histórico de registros recuperado com sucesso.', records);

    } catch (error) {
      logger.error(`Erro ao buscar histórico para employeeId ${requestedEmployeeId}:`, error);
      sendResponse(res, 500, 'Erro interno no servidor ao buscar histórico.');
    }
  }

  /**
   * @route GET /api/time-records/today
   * @description Busca o registro de ponto de hoje para o usuário autenticado.
   * @access Autenticado
   */
  async getTodaysRecord(req, res) {
    const employeeId = req.user.id;
    try {
      const record = await this._findOpenRecordToday(employeeId);
      if (!record) {
        // Tenta encontrar um registro fechado de hoje
        const closedRecord = await TimeRecord.findOne({
          where: {
            employeeId: employeeId,
            startTime: { [Op.gte]: new Date().setHours(0, 0, 0, 0), [Op.lt]: new Date(new Date().setHours(0, 0, 0, 0)).setDate(new Date().getDate() + 1) },
            endTime: { [Op.ne]: null } // Onde endTime não é nulo
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
      logger.error(`Erro ao buscar registro de hoje para employeeId ${employeeId}:`, error);
      sendResponse(res, 500, 'Erro interno ao buscar registro de hoje.');
    }
  }


}

// Exporta uma instância da classe
module.exports = new TimeRecordController();