const { Employee } = require('../models/employee.model');
const { sendResponse } = require('../utils/response.util');
const logger = require('../utils/logger.util');

class EmployeeController {
    async create(req, res) {
        try {
            const { fullName, email, password, role, weeklyHours } = req.body;

            const employee = await Employee.create({
                fullName,
                email,
                passwordHash: password,
                role,
                weeklyHours
            });

            sendResponse(res, 201, 'Funcionário criado com sucesso.', {
                id: employee.id,
                fullName: employee.fullName,
                email: employee.email,
                role: employee.role
            });
        } catch (error) {
            logger.error('Erro ao criar funcionário:', error);
            sendResponse(res, 500, 'Erro interno no servidor.');
        }
    }

    async getAll(req, res) {
        try {
            const employees = await Employee.findAll({
                attributes: ['id', 'fullName', 'email', 'role', 'weeklyHours']
            });
            sendResponse(res, 200, 'Funcionários listados.', employees);
        } catch (error) {
            logger.error('Erro ao listar funcionários:', error);
            sendResponse(res, 500, 'Erro interno no servidor.');
        }
    }
}

module.exports = new EmployeeController();