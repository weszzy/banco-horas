// src/services/auth.service.js
const jwt = require('jsonwebtoken');
const { Employee } = require('../models/employee.model'); // Importar Employee aqui pode ser útil para outras funções futuras, mas não estritamente necessário para generateToken
const logger = require('../utils/logger.util'); // Adicionado logger para erros

class AuthService {

    /**
     * Gera um token JWT para um funcionário.
     * @param {object} employee - Instância do modelo Employee ou objeto com id e role.
     * @returns {string|null} O token JWT gerado ou null em caso de erro.
     */
    static generateToken(employee) {
        // Validação básica de entrada
        if (!employee || !employee.id || !employee.role) {
            logger.error('[AuthService] Tentativa de gerar token sem dados essenciais do funcionário.', { employee });
            return null;
        }

        // Define o payload, segredo e opções
        const payload = {
            id: employee.id,
            role: employee.role
            // Não inclua dados sensíveis no payload
        };
        const secret = process.env.JWT_SECRET;
        const options = {
            expiresIn: process.env.JWT_EXPIRES_IN || '1h' // Usa variável de ambiente ou default
        };

        // Verifica se o segredo JWT está configurado
        if (!secret) {
            logger.error('[AuthService] JWT_SECRET não está definido no ambiente!');
            // Em um cenário real, lançar um erro aqui pode ser mais apropriado
            // para interromper o fluxo em caso de configuração crítica ausente.
            // throw new Error('Configuração de segurança ausente.');
            return null; // Retornar null é uma alternativa mais branda
        }

        try {
            // Gera e retorna o token
            const token = jwt.sign(payload, secret, options);
            logger.debug(`[AuthService] Token gerado para usuário ID ${employee.id}.`);
            return token;
        } catch (error) {
            logger.error('[AuthService] Erro ao gerar token JWT:', error);
            return null;
        }
    }

    /**
     * Encontra um funcionário pelo e-mail (mantido).
     * @param {string} email - O e-mail do funcionário.
     * @returns {Promise<Employee|null>} Instância do Employee ou null.
     */
    static async findEmployeeByEmail(email) {
        // Considerar adicionar case-insensitivity aqui se necessário
        // Ex: return Employee.findOne({ where: { email: Sequelize.where(Sequelize.fn('LOWER', Sequelize.col('email')), 'LIKE', email.toLowerCase()) } });
        return Employee.findOne({ where: { email } });
    }
}

module.exports = AuthService;