// Ajuste o caminho se o model estiver em outro local relativo
const { Employee } = require('../models/employee.model');
const { sendResponse } = require('../utils/response.util');
const logger = require('../utils/logger.util');

class EmployeeController {
    // Criar novo funcionário (acesso restrito por 'authorize' na rota)
    async create(req, res) {
        // Dados validados pelo middleware `validateEmployee`
        const { fullName, email, password, role, weeklyHours } = req.body;

        try {
            // O hook `beforeSave` no modelo cuidará do hash da senha
            const employee = await Employee.create({
                fullName,
                email,
                passwordHash: password, // Passa a senha em texto plano aqui
                role: role || 'employee', // Usa o role fornecido ou o default do modelo
                weeklyHours // Passa weeklyHours se fornecido
            });

            // Nunca retorne a senha ou o hash!
            const employeeData = {
                id: employee.id,
                fullName: employee.fullName,
                email: employee.email,
                role: employee.role,
                weeklyHours: employee.weeklyHours,
                createdAt: employee.createdAt // Opcional: retornar quando foi criado
            };

            logger.info(`Novo funcionário criado: ${employee.email} (ID: ${employee.id})`);
            sendResponse(res, 201, 'Funcionário criado com sucesso.', employeeData);

        } catch (error) {
            logger.error('Erro ao criar funcionário:', error);
            // Verifica se é erro de unicidade do email
            if (error.name === 'SequelizeUniqueConstraintError') {
                return sendResponse(res, 409, 'E-mail já cadastrado.', null, { field: 'email' }); // 409 Conflict
            }
            // Verifica erros de validação do modelo (embora o middleware já pegue alguns)
            if (error.name === 'SequelizeValidationError') {
                const messages = error.errors.map(e => e.message).join(', ');
                return sendResponse(res, 400, `Erro de validação: ${messages}`);
            }
            // Erro genérico
            sendResponse(res, 500, 'Erro interno no servidor ao criar funcionário.');
        }
    }

    // Listar todos os funcionários (acesso restrito por 'authenticate' na rota)
    async getAll(req, res) {
        try {
            // Seleciona apenas os campos necessários, excluindo a senha
            const employees = await Employee.findAll({
                attributes: ['id', 'fullName', 'email', 'role', 'weeklyHours', 'createdAt', 'updatedAt'],
                order: [['fullName', 'ASC']] // Ordena por nome
            });
            sendResponse(res, 200, 'Funcionários listados com sucesso.', employees);
        } catch (error) {
            logger.error('Erro ao listar funcionários:', error);
            sendResponse(res, 500, 'Erro interno no servidor ao listar funcionários.');
        }
    }

    // Buscar um funcionário pelo ID (acesso restrito por 'authenticate' na rota)
    async getById(req, res) {
        try {
            const { id } = req.params; // Pega o ID da URL

            const employee = await Employee.findByPk(id, {
                // Novamente, seleciona apenas os campos seguros
                attributes: ['id', 'fullName', 'email', 'role', 'weeklyHours', 'createdAt', 'updatedAt']
            });

            if (!employee) {
                return sendResponse(res, 404, 'Funcionário não encontrado.');
            }

            // Opcional: Verificar permissão (ex: só admin ou o próprio usuário pode ver?)
            // if (req.user.role !== 'admin' && req.user.id !== employee.id) {
            //     return sendResponse(res, 403, 'Acesso negado.');
            // }

            sendResponse(res, 200, 'Funcionário encontrado.', employee);
        } catch (error) {
            logger.error(`Erro ao buscar funcionário por ID (${req.params.id}):`, error);
            sendResponse(res, 500, 'Erro interno no servidor ao buscar funcionário.');
        }
    }


    // TODO: Implementar métodos para atualizar (update) e deletar (delete) funcionários
    // async update(req, res) { ... }
    // async delete(req, res) { ... }

}

// Exporta uma instância da classe
module.exports = new EmployeeController();