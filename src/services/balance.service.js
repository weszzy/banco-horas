// src/services/balance.service.js
const { TimeRecord } = require('../models/time-record.model');
const { Employee } = require('../models/employee.model');
const { Op, Sequelize } = require('sequelize'); // Importar Sequelize para funções/agregação
const logger = require('../utils/logger.util');

class BalanceService {

    /**
     * Calcula a meta de horas diárias para um funcionário.
     * Assume uma semana de 5 dias úteis por padrão.
     * @param {number} weeklyHours - Carga horária semanal do funcionário.
     * @returns {number} Meta de horas diárias, arredondada para 2 casas decimais.
     */
    _calculateDailyGoal(weeklyHours) {
        const workDaysPerWeek = 5; // TODO: Tornar configurável?
        if (!weeklyHours || weeklyHours <= 0 || workDaysPerWeek <= 0) {
            return 0;
        }
        // Arredonda para evitar problemas de ponto flutuante nos cálculos de saldo
        return parseFloat((weeklyHours / workDaysPerWeek).toFixed(2));
    }

    /**
     * Calcula o saldo de horas para um único registro de ponto finalizado.
     * Utilizado principalmente para cálculo de histórico ou antes de deletar.
     * @param {object} timeRecord - Instância do modelo TimeRecord (DEVE ter totalHours).
     * @param {object} employee - Instância do modelo Employee correspondente (DEVE ter weeklyHours).
     * @returns {number|null} Saldo de horas (positivo/negativo) ou null se inválido/impossível calcular.
     */
    calculateDailyBalance(timeRecord, employee) {
        if (!timeRecord || !employee || !timeRecord.totalHours || !employee.weeklyHours) {
            logger.warn(`[BalanceService] Não foi possível calcular saldo diário (calculateDailyBalance). Dados incompletos para Record ID: ${timeRecord?.id}, Employee ID: ${employee?.id}`);
            return null;
        }
        try {
            const dailyGoal = this._calculateDailyGoal(parseFloat(employee.weeklyHours));
            const workedHours = parseFloat(timeRecord.totalHours);

            // Verifica se os números são válidos após parse
            if (isNaN(dailyGoal) || isNaN(workedHours)) {
                logger.warn(`[BalanceService] Erro ao calcular saldo diário (calculateDailyBalance): Meta ou horas trabalhadas inválidas para Record ID: ${timeRecord.id}`);
                return null;
            }

            const dailyBalance = workedHours - dailyGoal;
            // Retorna o saldo arredondado para 2 casas decimais
            return parseFloat(dailyBalance.toFixed(2));
        } catch (error) {
            logger.error(`[BalanceService] Exceção em calculateDailyBalance para Record ID: ${timeRecord.id}`, error);
            return null;
        }

    }

    /**
     * Calcula o saldo de horas (trabalhadas vs meta) para um funcionário
     * em um dia específico, baseado em TODOS os registros finalizados daquele dia.
     *
     * @param {number} employeeId - ID do funcionário.
     * @param {Date | string} dateOrDateString - A data (objeto Date ou string 'YYYY-MM-DD').
     * @param {Sequelize.Transaction} [transaction] - Transação opcional.
     * @returns {Promise<number>} O saldo de horas TOTAL do dia (pode ser 0 se não houver registros ou erro).
     */
    async calculateDailyBalanceForDate(employeeId, dateOrDateString, transaction = null) {
        const operationDate = new Date(dateOrDateString);
        if (isNaN(operationDate.getTime())) {
            logger.error(`[BalanceService] Data inválida fornecida para cálculo de saldo diário: ${dateOrDateString}`);
            return 0;
        }

        const dayStart = new Date(operationDate); dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart); dayEnd.setDate(dayStart.getDate() + 1);

        logger.info(`[BalanceService] Calculando saldo para o dia ${dayStart.toISOString().split('T')[0]} (Employee ${employeeId})...`);

        try {
            // Busca funcionário APENAS para obter weeklyHours
            const employee = await Employee.findByPk(employeeId, { attributes: ['weeklyHours'], transaction });
            if (!employee || !employee.weeklyHours) {
                logger.warn(`[BalanceService] Funcionário ${employeeId} ou sua carga horária não encontrados para cálculo do dia.`);
                return 0; // Não pode calcular sem a meta
            }

            const dailyGoal = this._calculateDailyGoal(parseFloat(employee.weeklyHours));

            // Busca e SOMA as horas trabalhadas de todos registros finalizados do dia
            const result = await TimeRecord.findOne({
                attributes: [
                    [Sequelize.fn('SUM', Sequelize.col('total_hours')), 'totalWorkedDay']
                ],
                where: {
                    employeeId: employeeId,
                    startTime: { [Op.gte]: dayStart, [Op.lt]: dayEnd },
                    endTime: { [Op.ne]: null } // Apenas finalizados
                },
                group: ['employeeId'], // Obrigatório para agregação SUM
                plain: true,
                transaction
            });

            const totalWorkedHoursToday = result && result.getDataValue('totalWorkedDay') ? parseFloat(result.getDataValue('totalWorkedDay')) : 0;

            const dailyBalance = totalWorkedHoursToday - dailyGoal;
            const roundedDailyBalance = parseFloat(dailyBalance.toFixed(2)); // Arredonda

            logger.info(`[BalanceService] Saldo calculado para o dia ${dayStart.toISOString().split('T')[0]} (Employee ${employeeId}): Worked=${totalWorkedHoursToday.toFixed(2)}h, Goal=${dailyGoal.toFixed(2)}h, Balance=${roundedDailyBalance.toFixed(2)}h`);

            return roundedDailyBalance; // Retorna o saldo *apenas* para este dia

        } catch (error) {
            logger.error(`[BalanceService] Erro ao calcular saldo diário para Employee ${employeeId} na data ${operationDate.toISOString()}:`, error);
            return 0; // Retorna 0 em caso de erro
        }
    }

    /**
     * Atualiza o saldo acumulado ('hourBalance') de um funcionário,
     * adicionando ou subtraindo um valor delta atomicamente.
     * @param {number} employeeId - ID do funcionário.
     * @param {number} balanceDelta - Valor a ser adicionado (positivo) ou subtraído (negativo).
     * @param {Sequelize.Transaction} [transaction] - Transação opcional.
     * @returns {Promise<boolean>} True se sucesso, false se erro ou funcionário não encontrado/inativo.
     */
    async updateAccumulatedBalance(employeeId, balanceDelta, transaction = null) {
        if (typeof balanceDelta !== 'number' || isNaN(balanceDelta)) {
            logger.error(`[BalanceService] Tentativa de atualizar saldo com delta inválido (${balanceDelta}) para Employee ${employeeId}.`);
            return false;
        }
        const roundedDelta = parseFloat(balanceDelta.toFixed(2)); // Arredonda delta

        // Se o delta for zero, não precisa fazer nada no banco
        if (roundedDelta === 0) {
            logger.info(`[BalanceService] Delta de saldo é zero para Employee ${employeeId}. Nenhuma atualização necessária.`);
            return true;
        }

        logger.info(`[BalanceService] Tentando ATUALIZAR saldo acumulado para Employee ${employeeId} por ${roundedDelta.toFixed(2)}h.`);

        try {
            // Busca o funcionário para garantir que existe e está ativo, e para usar o método increment
            const employee = await Employee.findByPk(employeeId, { attributes: ['id', 'isActive'], transaction });
            if (!employee) {
                logger.error(`[BalanceService] Funcionário ${employeeId} não encontrado para atualização de saldo.`);
                return false;
            }
            if (!employee.isActive) {
                logger.info(`[BalanceService] Funcionário ${employeeId} inativo. Saldo acumulado não atualizado.`);
                return true; // Não é um erro, mas não atualiza
            }

            // Usa o método increment do Sequelize que é atômico (faz UPDATE ... SET hourBalance = hourBalance + delta)
            const [results] = await Employee.increment( // increment retorna [affectedRows, metadata] ou [instance, created] dependendo do dialeto/versão
                { hourBalance: roundedDelta },
                { where: { id: employeeId }, transaction }
            );

            // Verifica se alguma linha foi realmente afetada (pode não ser necessário com findByPk antes)
            if (results === 0) {
                logger.warn(`[BalanceService] Comando increment para Employee ${employeeId} não afetou nenhuma linha.`);
                // Isso pode indicar um problema, mas a operação em si não falhou
                // return false; // Ou retorna true? Depende se consideramos isso um erro. Vamos considerar sucesso por enquanto.
            }


            logger.info(`[BalanceService] Saldo acumulado de Employee ${employeeId} atualizado com delta ${roundedDelta.toFixed(2)}h.`);
            return true; // Sucesso na operação

        } catch (error) {
            logger.error(`[BalanceService] Erro ao ATUALIZAR saldo acumulado para Employee ${employeeId}:`, error);
            return false; // Falha
        }
    }

    /**
     * Calcula e retorna o histórico de saldo para exibição.
     * @param {number} employeeId
     * @param {Date} startDate
     * @param {Date} endDate
     * @returns {Promise<Array<object>>} Array com { id, date, workedHours, dailyGoal, dailyBalance, notes? }
     */
    async getBalanceHistory(employeeId, startDate, endDate) {
        try {
            const employee = await Employee.findByPk(employeeId); // Precisa dos dados do employee
            if (!employee) throw new Error("Funcionário não encontrado.");

            const endOfDay = new Date(endDate);
            endOfDay.setHours(23, 59, 59, 999);

            const records = await TimeRecord.findAll({
                where: {
                    employeeId: employeeId,
                    startTime: { [Op.gte]: startDate, [Op.lte]: endOfDay },
                    endTime: { [Op.ne]: null }
                },
                order: [['startTime', 'ASC']]
            });

            const history = records.map(record => {
                const dailyGoal = this._calculateDailyGoal(parseFloat(employee.weeklyHours));
                const workedHours = record.totalHours ? parseFloat(record.totalHours) : 0;
                // Usa calculateDailyBalance para obter o saldo daquele registro específico
                const dailyBalance = this.calculateDailyBalance(record, employee) ?? 0; // Usa 0 se retornar null

                return {
                    id: record.id, // Inclui o ID do registro
                    date: record.startTime,
                    workedHours: workedHours.toFixed(2),
                    dailyGoal: dailyGoal.toFixed(2),
                    dailyBalance: dailyBalance.toFixed(2),
                    notes: record.notes
                };
            });

            return history;

        } catch (error) {
            logger.error(`[BalanceService] Erro ao buscar histórico de saldo para Employee ${employeeId}:`, error);
            throw error; // Re-lança para o controller tratar
        }
    }

}

// Exporta uma instância singleton do serviço
module.exports = new BalanceService();