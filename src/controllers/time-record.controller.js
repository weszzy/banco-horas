const { TimeRecord } = require('../models/time-record.model');
const { sendResponse } = require('../utils/response.util');
const logger = require('../utils/logger.util');

class TimeRecordController {
  async checkIn(req, res) {
    try {
      const { employeeId } = req.body;
      const record = await TimeRecord.create({
        employeeId,
        startTime: new Date()
      });
      sendResponse(res, 201, 'Check-in registrado.', record);
    } catch (error) {
      logger.error('Erro no check-in:', error);
      sendResponse(res, 500, 'Erro interno no servidor.');
    }
  }

  async checkOut(req, res) {
    try {
      const { recordId } = req.body;
      const record = await TimeRecord.findByPk(recordId);
      if (!record) {
        return sendResponse(res, 404, 'Registro não encontrado.');
      }
      record.endTime = new Date();
      await record.save();
      sendResponse(res, 200, 'Check-out registrado.', record);
    } catch (error) {
      logger.error('Erro no check-out:', error);
      sendResponse(res, 500, 'Erro interno no servidor.');
    }
  }
}

module.exports = new TimeRecordController();