const jwt = require('jsonwebtoken');
const { Employee } = require('../models/employee.model');
const { sendResponse } = require('../utils/response.util');
const logger = require('../utils/logger.util');

class AuthController {
    async login(req, res) {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return sendResponse(res, 400, 'E-mail e senha são obrigatórios.');
            }

            const employee = await Employee.findOne({ where: { email } });
            if (!employee) {
                return sendResponse(res, 401, 'Credenciais inválidas.');
            }

            const isPasswordValid = await employee.verifyPassword(password);
            if (!isPasswordValid) {
                return sendResponse(res, 401, 'Credenciais inválidas.');
            }

            const token = jwt.sign(
                { id: employee.id, role: employee.role },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
            );

            sendResponse(res, 200, 'Login realizado.', {
                token,
                user: { id: employee.id, fullName: employee.fullName, role: employee.role }
            });
        } catch (error) {
            logger.error('Erro no login:', error);
            sendResponse(res, 500, 'Erro interno no servidor.');
        }
    }
}

module.exports = new AuthController();