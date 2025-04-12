// src/controllers/auth.controller.js
// const jwt = require('jsonwebtoken'); // Não é mais necessário aqui
const { Employee } = require('../models/employee.model');
const AuthService = require('../services/auth.service'); // Importar o serviço
const { sendResponse } = require('../utils/response.util');
const logger = require('../utils/logger.util');

class AuthController {
    async login(req, res) {
        const { email, password } = req.body;

        try {
            // Busca o funcionário pelo e-mail usando o serviço
            const employee = await AuthService.findEmployeeByEmail(email);

            // Verifica se o funcionário existe E se a senha está correta
            if (!employee || !(await employee.verifyPassword(password))) {
                logger.warn(`Tentativa de login falhou para o email: ${email}`);
                return sendResponse(res, 401, 'Credenciais inválidas.');
            }

            // Gera o token JWT usando o serviço
            const token = AuthService.generateToken(employee);

            // Verifica se o token foi gerado com sucesso
            if (!token) {
                // O AuthService já logou o erro (JWT_SECRET faltando ou erro jwt.sign)
                return sendResponse(res, 500, 'Erro interno no servidor ao gerar autenticação.');
            }

            logger.info(`Login bem-sucedido para o usuário: ${employee.email} (ID: ${employee.id})`);

            // Retorna o token e informações básicas do usuário (não a senha!)
            sendResponse(res, 200, 'Login realizado com sucesso.', {
                token,
                user: {
                    id: employee.id,
                    fullName: employee.fullName,
                    email: employee.email,
                    role: employee.role
                }
            });

        } catch (error) {
            // Captura outros erros inesperados (ex: falha na busca do DB)
            logger.error('Erro inesperado durante o login:', error);
            sendResponse(res, 500, 'Erro interno no servidor durante o login.');
        }
    }
}

// Exporta uma instância da classe
module.exports = new AuthController();