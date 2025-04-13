// src/controllers/employee.controller.js
const { Employee } = require('../models/employee.model'); // Caminho para o modelo
const { sendResponse } = require('../utils/response.util'); // Helper de resposta
const logger = require('../utils/logger.util'); // Logger
const { Op } = require('sequelize'); // Operadores Sequelize (se necessário para queries complexas)
const BalanceService = require('../services/balance.service');

class EmployeeController {

    // Construtor para vincular 'this' nos métodos usados como route handlers
    constructor() {
        this.create = this.create.bind(this);
        this.getAll = this.getAll.bind(this);
        this.getById = this.getById.bind(this);
        this.getMe = this.getMe.bind(this); // Novo método para dados do usuário logado
        this.update = this.update.bind(this); // Novo método para atualizar funcionário
        this.updateStatus = this.updateStatus.bind(this); // Novo método para ativar/desativar
    }

    // Função helper para definir atributos seguros a serem retornados pela API
    // Evita retornar dados sensíveis como passwordHash.
    _safeAttributes() {
        return [
            'id', 'fullName', 'email', 'role', 'weeklyHours',
            'birthDate', 'hireDate', 'photoUrl', 'hourBalance',
            'isActive', 'createdAt', 'updatedAt'
        ];
    }

    /**
     * @route POST /api/employees
     * @description Cria um novo funcionário. Acesso: Admin.
     * @param {object} req - Objeto da requisição Express (body contém os dados).
     * @param {object} res - Objeto da resposta Express.
     */
    async create(req, res) {
        // Extrai dados do corpo da requisição (já validados pelo middleware)
        const { fullName, email, password, role, weeklyHours, birthDate, hireDate, photoUrl } = req.body;
        try {
            // Cria o funcionário no banco. O hook beforeSave cuidará do hash da senha.
            const employee = await Employee.create({
                fullName,
                email,
                passwordHash: password, // Passa senha em texto plano, hook faz o hash
                role: role || 'employee', // Usa role fornecido ou default
                weeklyHours, // Assumindo que é obrigatório e validado
                birthDate: birthDate || null, // Define como null se não fornecido
                hireDate: hireDate || null,
                photoUrl: photoUrl || null,
                // hourBalance e isActive usarão os defaults do modelo (0.0 e true)
            });

            // Prepara os dados seguros para a resposta (sem o hash da senha)
            const safeData = { ...employee.get({ plain: true }) };
            delete safeData.passwordHash;

            logger.info(`Novo funcionário criado: ${employee.email} (ID: ${employee.id})`);
            sendResponse(res, 201, 'Funcionário criado com sucesso.', safeData); // 201 Created

        } catch (error) {
            logger.error('Erro ao criar funcionário:', error);
            // Tratamento específico para erros comuns
            if (error.name === 'SequelizeUniqueConstraintError') {
                // Email já existe
                return sendResponse(res, 409, 'E-mail já cadastrado.', null, { field: 'email' }); // 409 Conflict
            }
            if (error.name === 'SequelizeValidationError') {
                // Erro de validação do modelo
                const messages = error.errors.map(e => `${e.path}: ${e.message}`).join('; ');
                return sendResponse(res, 400, `Erro de validação: ${messages}`); // 400 Bad Request
            }
            // Erro genérico
            sendResponse(res, 500, 'Erro interno no servidor ao criar funcionário.');
        }
    }

    /**
     * @route GET /api/employees
     * @description Lista todos os funcionários. Acesso: Admin (ou Gerente).
     * @param {object} req - Objeto da requisição Express (pode ter query params como ?active=true).
     * @param {object} res - Objeto da resposta Express.
     */
    async getAll(req, res) {
        // Exemplo de filtro por status (ativo/inativo) via query param
        const { active } = req.query;
        let whereClause = {}; // Cláusula WHERE inicial vazia
        if (active === 'true') {
            whereClause.isActive = true;
        } else if (active === 'false') {
            whereClause.isActive = false;
        }
        // TODO: Implementar paginação (limit, offset) para muitos funcionários

        try {
            const employees = await Employee.findAll({
                attributes: this._safeAttributes(), // Retorna apenas campos seguros
                where: whereClause, // Aplica o filtro (se houver)
                order: [['fullName', 'ASC']] // Ordena por nome
            });
            sendResponse(res, 200, 'Funcionários listados com sucesso.', employees);
        } catch (error) {
            logger.error('Erro ao listar funcionários:', error);
            sendResponse(res, 500, 'Erro interno no servidor ao listar funcionários.');
        }
    }

    /**
     * @route GET /api/employees/:id
     * @description Obtém dados de um funcionário específico por ID. Acesso: Admin ou o próprio usuário.
     * @param {object} req - Objeto da requisição Express (req.params.id, req.user do token).
     * @param {object} res - Objeto da resposta Express.
     */
    async getById(req, res) {
        try {
            const requestedEmployeeId = req.params.id; // ID da URL
            const loggedInUserId = req.user.id;       // ID do usuário logado (token)
            const loggedInUserRole = req.user.role;   // Papel do usuário logado

            // Validação de permissão: Admin pode ver qualquer um, usuário normal só a si mesmo.
            if (loggedInUserRole !== 'admin' && loggedInUserId.toString() !== requestedEmployeeId) {
                logger.warn(`Usuário ${loggedInUserId} (${loggedInUserRole}) tentou acessar dados do funcionário ${requestedEmployeeId}`);
                return sendResponse(res, 403, 'Acesso negado.'); // 403 Forbidden
            }

            // Busca o funcionário pelo ID (Primary Key)
            const employee = await Employee.findByPk(requestedEmployeeId, {
                attributes: this._safeAttributes() // Apenas campos seguros
            });

            if (!employee) {
                return sendResponse(res, 404, 'Funcionário não encontrado.'); // 404 Not Found
            }
            sendResponse(res, 200, 'Funcionário encontrado.', employee); // 200 OK

        } catch (error) {
            logger.error(`Erro ao buscar funcionário por ID (${req.params.id}):`, error);
            sendResponse(res, 500, 'Erro interno no servidor ao buscar funcionário.');
        }
    }

    /**
     * @route GET /api/employees/me
     * @description Obtém dados do PRÓPRIO usuário autenticado. Acesso: Qualquer usuário logado.
     * @param {object} req - Objeto da requisição Express (req.user do token).
     * @param {object} res - Objeto da resposta Express.
     */
    async getMe(req, res) {
        try {
            const employeeId = req.user.id; // Pega o ID do usuário do token
            const employee = await Employee.findByPk(employeeId, {
                attributes: this._safeAttributes() // Apenas campos seguros
            });
            if (!employee) {
                // Se o token é válido mas o usuário não existe no DB, algo está errado.
                logger.error(`Usuário autenticado (ID: ${employeeId}) não encontrado no banco de dados.`);
                return sendResponse(res, 404, 'Usuário não encontrado.');
            }
            sendResponse(res, 200, 'Dados do usuário recuperados.', employee);
        } catch (error) {
            logger.error(`Erro ao buscar dados do próprio usuário (ID: ${req.user.id}):`, error);
            sendResponse(res, 500, 'Erro interno ao buscar dados do usuário.');
        }
    }

    /**
     * @route PUT /api/employees/:id
     * @description Atualiza dados de um funcionário. Acesso: Admin.
     * @param {object} req - Objeto da requisição Express (req.params.id, req.body com dados).
     * @param {object} res - Objeto da resposta Express.
     */
    async update(req, res) {
        const employeeIdToUpdate = req.params.id;
        // Dados permitidos para atualização (Excluir email, senha, isActive, hourBalance daqui)
        const { fullName, role, weeklyHours, birthDate, hireDate, photoUrl } = req.body;

        // TODO: Adicionar validação mais robusta para os dados de update (talvez um middleware)
        if (!fullName || !role || weeklyHours === undefined || weeklyHours === null) {
            return sendResponse(res, 400, 'Campos obrigatórios (Nome, Cargo, Carga Horária) ausentes ou inválidos para atualização.');
        }

        try {
            // Busca o funcionário que será atualizado
            const employee = await Employee.findByPk(employeeIdToUpdate);
            if (!employee) {
                return sendResponse(res, 404, 'Funcionário não encontrado para atualização.');
            }

            // Atualiza os campos no objeto do modelo
            employee.fullName = fullName;
            employee.role = role;
            employee.weeklyHours = weeklyHours;
            employee.birthDate = birthDate || null;
            employee.hireDate = hireDate || null;
            employee.photoUrl = photoUrl || null;

            // Salva as alterações no banco de dados
            await employee.save();

            // Prepara a resposta com dados seguros
            const safeData = { ...employee.get({ plain: true }) };
            delete safeData.passwordHash;

            logger.info(`Funcionário atualizado: ${employee.email} (ID: ${employee.id})`);
            sendResponse(res, 200, 'Funcionário atualizado com sucesso.', safeData); // 200 OK

        } catch (error) {
            logger.error(`Erro ao atualizar funcionário (ID: ${employeeIdToUpdate}):`, error);
            if (error.name === 'SequelizeValidationError') {
                const messages = error.errors.map(e => `${e.path}: ${e.message}`).join('; ');
                return sendResponse(res, 400, `Erro de validação: ${messages}`);
            }
            // Outros erros (ex: falha de conexão)
            sendResponse(res, 500, 'Erro interno ao atualizar funcionário.');
        }
    }

    /**
     * @route PATCH /api/employees/:id/status
     * @description Ativa ou desativa um funcionário. Acesso: Admin.
     * @param {object} req - Objeto da requisição Express (req.params.id, req.body com { isActive: boolean }).
     * @param {object} res - Objeto da resposta Express.
     */
    async updateStatus(req, res) {
        const employeeIdToUpdate = req.params.id;
        const { isActive } = req.body; // Espera { "isActive": true } ou { "isActive": false }

        // Valida o input
        if (typeof isActive !== 'boolean') {
            return sendResponse(res, 400, 'Valor inválido para "isActive". Use true ou false.');
        }

        try {
            const employee = await Employee.findByPk(employeeIdToUpdate);
            if (!employee) {
                return sendResponse(res, 404, 'Funcionário não encontrado.');
            }

            // Regra de negócio: Impedir que admin desative a si próprio (opcional)
            if (employee.id.toString() === req.user.id.toString() && !isActive) {
                return sendResponse(res, 400, 'Você não pode desativar sua própria conta.');
            }

            // Atualiza apenas o status
            employee.isActive = isActive;
            // Salva apenas os campos modificados (isActive e updatedAt)
            await employee.save({ fields: ['isActive', 'updatedAt'] });

            const statusMsg = isActive ? 'ativado' : 'desativado';
            logger.info(`Funcionário ${statusMsg}: ${employee.email} (ID: ${employee.id}) por usuário ${req.user.id}`);
            sendResponse(res, 200, `Funcionário ${statusMsg} com sucesso.`, { id: employee.id, isActive: employee.isActive }); // 200 OK

        } catch (error) {
            logger.error(`Erro ao atualizar status do funcionário (ID: ${employeeIdToUpdate}):`, error);
            sendResponse(res, 500, 'Erro interno ao atualizar status do funcionário.');
        }
    }

    /**
         * @route PATCH /api/employees/:id/zero-balance
         * @description (Admin) Zera o saldo de horas acumulado de um funcionário.
         * @param {object} req - Objeto da requisição Express (req.params.id).
         * @param {object} res - Objeto da resposta Express.
         */
    async zeroBalance(req, res) {
        const employeeIdToUpdate = req.params.id;
        const adminUserId = req.user.id; // Para log

        logger.info(`[Admin Action] Tentativa de ZERAR saldo para Employee ID ${employeeIdToUpdate} por Admin ID ${adminUserId}.`);

        // Não permitir zerar o próprio saldo (opcional, mas talvez uma boa prática)
        if (employeeIdToUpdate === adminUserId.toString()) {
            logger.warn(`[Admin Action] Admin ${adminUserId} tentou zerar o próprio saldo.`);
            return sendResponse(res, 400, 'Não é permitido zerar o próprio saldo diretamente.');
        }

        try {
            // Busca o funcionário
            const employee = await Employee.findByPk(employeeIdToUpdate);
            if (!employee) {
                return sendResponse(res, 404, 'Funcionário não encontrado.');
            }

            // Define o saldo como 0.00
            employee.hourBalance = 0.00;

            // Salva a alteração (apenas hourBalance e updatedAt)
            await employee.save({ fields: ['hourBalance', 'updatedAt'] });

            logger.info(`[Admin Action] Saldo ZERADO com sucesso para Employee ID ${employeeIdToUpdate} por Admin ID ${adminUserId}.`);
            sendResponse(res, 200, 'Saldo de horas zerado com sucesso.', { id: employee.id, hourBalance: employee.hourBalance });

        } catch (error) {
            logger.error(`[Admin Action] Erro ao zerar saldo do funcionário (ID: ${employeeIdToUpdate}):`, error);
            sendResponse(res, 500, 'Erro interno ao zerar saldo do funcionário.');
        }
    }
    

    /**
         * @route PATCH /api/employees/:id/adjust-balance
         * @description (Admin) Ajusta manualmente o saldo de horas acumulado (adiciona ou subtrai).
         * @param {object} req - Objeto da requisição Express (req.params.id, req.body com { adjustment: number, reason?: string }).
         * @param {object} res - Objeto da resposta Express.
         */
    async adjustBalance(req, res) {
        const employeeIdToUpdate = req.params.id;
        const adminUserId = req.user.id;
        const { adjustment, reason } = req.body; // adjustment: valor a somar (pode ser negativo)

        logger.info(`[Admin Action] Tentativa de AJUSTAR saldo para Employee ID ${employeeIdToUpdate} por ${adjustment}h por Admin ID ${adminUserId}. Razão: ${reason || 'Não informada'}`);

        // --- Validação do Input ---
        const adjustmentValue = parseFloat(adjustment);
        if (isNaN(adjustmentValue)) {
            return sendResponse(res, 400, 'Valor de ajuste inválido. Deve ser um número.');
        }
        if (adjustmentValue === 0) {
            return sendResponse(res, 400, 'Valor de ajuste não pode ser zero.');
        }

        // Não permitir ajustar o próprio saldo (opcional)
        if (employeeIdToUpdate === adminUserId.toString()) {
            logger.warn(`[Admin Action] Admin ${adminUserId} tentou ajustar o próprio saldo.`);
            return sendResponse(res, 400, 'Não é permitido ajustar o próprio saldo diretamente.');
        }

        try {
            // Chama o BalanceService para fazer a atualização atômica
            // O BalanceService já verifica se o funcionário existe e está ativo.
            const success = await BalanceService.updateAccumulatedBalance(
                parseInt(employeeIdToUpdate, 10), // Garante que é número
                adjustmentValue // Passa o valor do ajuste diretamente
                // Não precisamos de transação aqui, pois updateAccumulatedBalance é atômico
            );

            if (!success) {
                // O BalanceService já logou o erro específico (ex: funcionário não encontrado/inativo, erro DB)
                // Retornamos um erro genérico ou uma mensagem indicando que não foi possível.
                return sendResponse(res, 400, 'Não foi possível ajustar o saldo. Verifique se o funcionário existe e está ativo.');
            }

            // Busca o funcionário novamente para retornar o saldo atualizado
            const updatedEmployee = await Employee.findByPk(employeeIdToUpdate, { attributes: ['id', 'hourBalance'] });

            // TODO: Registrar a auditoria do ajuste (quem fez, quando, valor, motivo) em uma tabela separada?

            logger.info(`[Admin Action] Saldo AJUSTADO com sucesso para Employee ID ${employeeIdToUpdate} por Admin ID ${adminUserId}. Novo saldo: ${updatedEmployee?.hourBalance}`);
            sendResponse(res, 200, 'Saldo de horas ajustado com sucesso.', { id: updatedEmployee?.id, hourBalance: updatedEmployee?.hourBalance });

        } catch (error) {
            // Captura erros inesperados não tratados pelo BalanceService
            logger.error(`[Admin Action] Erro inesperado ao ajustar saldo do funcionário (ID: ${employeeIdToUpdate}):`, error);
            sendResponse(res, 500, 'Erro interno ao ajustar saldo do funcionário.');
        }
    }
}








// Exporta uma instância única do controller
module.exports = new EmployeeController();