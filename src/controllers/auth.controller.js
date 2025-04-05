const jwt = require('jsonwebtoken');
// Ajuste o caminho se o model estiver em outro local relativo
const { Employee } = require('../models/employee.model'); // Certifique-se que o caminho está correto
const { sendResponse } = require('../utils/response.util');
const logger = require('../utils/logger.util');
// O AuthService parece não ser usado aqui, pode ser removido se não for chamado.
// const AuthService = require('../services/auth.service');

class AuthController {
    async login(req, res) {
        // A validação básica (presença de email/senha) é feita pelo middleware `validateLogin`
        const { email, password } = req.body;

        try {
            // Busca o funcionário pelo e-mail (case-insensitive é recomendado no DB ou na query)
            const employee = await Employee.findOne({ where: { email: email } }); // Sequelize é case-sensitive por padrão

            // Verifica se o funcionário existe E se a senha está correta
            // A verificação de senha só deve ocorrer se o funcionário for encontrado
            if (!employee || !(await employee.verifyPassword(password))) {
                logger.warn(`Tentativa de login falhou para o email: ${email}`);
                // Resposta genérica para não informar se o email existe ou não
                return sendResponse(res, 401, 'Credenciais inválidas.');
            }

            // Gera o token JWT com informações essenciais
            const payload = {
                id: employee.id,
                role: employee.role
                // Não inclua dados sensíveis no payload
            };
            const secret = process.env.JWT_SECRET;
            const options = {
                expiresIn: process.env.JWT_EXPIRES_IN || '1h' // Usa variável de ambiente ou default
            };

            if (!secret) {
                logger.error('JWT_SECRET não está definido no ambiente!');
                return sendResponse(res, 500, 'Erro interno no servidor [JWT Config]');
            }

            const token = jwt.sign(payload, secret, options);

            logger.info(`Login bem-sucedido para o usuário: ${employee.email} (ID: ${employee.id})`);

            // Retorna o token e informações básicas do usuário (não a senha!)
            sendResponse(res, 200, 'Login realizado com sucesso.', {
                token,
                user: {
                    id: employee.id,
                    fullName: employee.fullName, // Usar fullName padronizado
                    email: employee.email,
                    role: employee.role
                }
            });

        } catch (error) {
            logger.error('Erro inesperado durante o login:', error);
            sendResponse(res, 500, 'Erro interno no servidor durante o login.');
        }
    }
}

// Exporta uma instância da classe
module.exports = new AuthController();