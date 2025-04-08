const { TimeRecord } = require('../models/time-record.model');
const { Employee } = require('../models/employee.model');
const { Op, Sequelize } = require('sequelize');
const logger = require('../utils/logger.util');

class BalanceService {

    /**
     * Calcula a meta de horas diárias para um funcionário.
     * Assume uma semana de 5 dias úteis por padrão.
     * @param {number} weeklyHours - Carga horária semanal do funcionário.
     * @returns {number} Meta de horas diárias.
     */
    _calculateDailyGoal(weeklyHours) {
        // TODO: Considerar uma configuração mais flexível (ex: 6 dias/semana?)
        const workDaysPerWeek = 5;
        if (!weeklyHours || weeklyHours <= 0 || workDaysPerWeek <= 0) {
            return 0; // Evita divisão por zero ou metas inválidas
        }
        return weeklyHours / workDaysPerWeek;
    }

    /**
     * Calcula o saldo de horas para um único registro de ponto finalizado.
     * @param {object} timeRecord - Instância do modelo TimeRecord.
     * @param {object} employee - Instância do modelo Employee correspondente.
     * @returns {number|null} Saldo de horas do dia (positivo ou negativo) ou null se inválido.
     */
    calculateDailyBalance(timeRecord, employee) {
        if (!timeRecord || !employee || !timeRecord.totalHours || !employee.weeklyHours) {
            logger.warn(`Não foi possível calcular saldo diário. Dados incompletos para Record ID: ${timeRecord?.id}, Employee ID: ${employee?.id}`);
            return null; // Não pode calcular sem os dados necessários
        }

        const dailyGoal = this._calculateDailyGoal(parseFloat(employee.weeklyHours));
        const workedHours = parseFloat(timeRecord.totalHours);

        if (isNaN(dailyGoal) || isNaN(workedHours)) {
            logger.warn(`Erro ao calcular saldo diário: Meta ou horas trabalhadas inválidas para Record ID: ${timeRecord.id}`);
            return null;
        }

        const dailyBalance = workedHours - dailyGoal;
        return dailyBalance; // Pode ser positivo ou negativo
    }

    /**
        * Recalcula o saldo de horas trabalhadas versus meta para um funcionário
        * em um dia específico e atualiza o saldo acumulado (hour_balance).
        *
        * @param {number} employeeId - ID do funcionário.
        * @param {Date | string} dateOrDateString - A data (objeto Date ou string 'YYYY-MM-DD') para recalcular.
        * @param {Sequelize.Transaction} [transaction] - Transação opcional do Sequelize.
        * @returns {Promise<boolean>} True se o saldo foi recalculado (mesmo que não tenha mudado), false se erro ou funcionário inativo.
        */
    async recalculateAndUpdateBalanceForDate(employeeId, dateOrDateString, transaction = null) {
        const operationDate = new Date(dateOrDateString); // Converte string para Date se necessário
        if (isNaN(operationDate.getTime())) {
            logger.error(`[BalanceService] Data inválida fornecida para recálculo: ${dateOrDateString}`);
            return false;
        }

        // Garante que estamos pegando o dia inteiro no fuso horário do servidor/DB
        const dayStart = new Date(operationDate);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayStart.getDate() + 1);

        logger.info(`[BalanceService] Recalculando saldo para Employee ${employeeId} na data ${dayStart.toISOString().split('T')[0]}...`);

        try {
            const employee = await Employee.findByPk(employeeId, { transaction }); // Usa transação se fornecida
            if (!employee) {
                logger.error(`[BalanceService] Funcionário ${employeeId} não encontrado para recálculo.`);
                return false;
            }
            if (!employee.isActive) {
                logger.info(`[BalanceService] Funcionário ${employeeId} inativo. Recálculo pulado.`);
                return true; // Considera sucesso, pois não há o que fazer
            }

            // Calcula o saldo ANTERIOR para este dia (se já existia)
            // Isso é importante para aplicar apenas a DIFERENÇA no saldo acumulado
            // Vamos simplificar por agora e recalcular o saldo acumulado desde o início do dia
            // TODO: Implementar lógica de saldo delta para maior precisão com edições múltiplas

            // --- Recálculo do Saldo do Dia ---
            // Busca todos os registros FINALIZADOS para o dia
            const records = await TimeRecord.findAll({
                where: {
                    employeeId: employeeId,
                    startTime: { [Op.gte]: dayStart, [Op.lt]: dayEnd },
                    endTime: { [Op.ne]: null } // Apenas registros com check-out
                },
                transaction // Usa transação
            });

            let totalWorkedHoursToday = 0;
            if (records.length > 0) {
                // Soma as horas totais de todos os registros do dia
                // parseFloat é crucial pois totalHours é DECIMAL
                totalWorkedHoursToday = records.reduce((sum, record) => sum + (record.totalHours ? parseFloat(record.totalHours) : 0), 0);
            }
            logger.info(`[BalanceService] Total trabalhado em ${dayStart.toISOString().split('T')[0]} por Employee ${employeeId}: ${totalWorkedHoursToday.toFixed(2)}h`);


            // Calcula a meta diária
            const dailyGoal = this._calculateDailyGoal(parseFloat(employee.weeklyHours));
            logger.info(`[BalanceService] Meta diária para Employee ${employeeId}: ${dailyGoal.toFixed(2)}h`);

            // Calcula o saldo APENAS para este dia
            const currentDailyBalance = totalWorkedHoursToday - dailyGoal;
            logger.info(`[BalanceService] Saldo calculado para o dia ${dayStart.toISOString().split('T')[0]}: ${currentDailyBalance.toFixed(2)}h`);


            // --- ATUALIZAÇÃO DO SALDO ACUMULADO ---
            // Esta é uma simplificação. Uma abordagem robusta recalcularia TUDO ou usaria deltas.
            // Vamos recalcular o saldo TOTAL acumulado varrendo todos os registros finalizados até o fim do dia.
            const allFinishedRecords = await TimeRecord.findAll({
                where: {
                    employeeId: employeeId,
                    endTime: {
                        [Op.ne]: null, // Finalizados
                        [Op.lt]: dayEnd  // Até o fim do dia recalculado
                    }
                },
                order: [['startTime', 'ASC']], // Importante processar em ordem
                transaction
            });

            let newAccumulatedBalance = 0;
            for (const record of allFinishedRecords) {
                const dailyBal = this.calculateDailyBalance(record, employee);
                if (dailyBal !== null) {
                    newAccumulatedBalance += dailyBal;
                }
            }

            // Atualiza o saldo no funcionário
            // Usamos update direto para garantir atomicidade se não estivermos em uma transação maior
            await Employee.update(
                { hourBalance: newAccumulatedBalance.toFixed(2) }, // Garante 2 casas decimais
                { where: { id: employeeId }, transaction }
            );

            logger.info(`[BalanceService] Saldo acumulado RECALCULADO e atualizado para Employee ${employeeId}: ${newAccumulatedBalance.toFixed(2)}h`);

            return true; // Indica que o recálculo foi tentado

        } catch (error) {
            logger.error(`[BalanceService] Erro GERAL ao recalcular saldo para Employee ${employeeId} na data ${operationDate.toISOString()}:`, error);
            // Se estivermos em uma transação, ela pode ser revertida no nível superior
            return false; // Indica falha
        }
    }


    /**
     * Atualiza o saldo acumulado de banco de horas para um funcionário
     * com base nos registros de um dia específico.
     * @param {number} employeeId - ID do funcionário.
     * @param {Date} date - A data para a qual calcular e atualizar o saldo.
     * @returns {Promise<number|null>} O novo saldo acumulado ou null se erro/nenhum registro.
     */
    async updateEmployeeBalanceForDate(employeeId, date) {
        try {
            const employee = await Employee.findByPk(employeeId);
            if (!employee) {
                logger.error(`[BalanceService] Funcionário não encontrado: ${employeeId}`);
                return null;
            }
            if (!employee.isActive) {
                logger.info(`[BalanceService] Funcionário ${employeeId} está inativo. Saldo não atualizado.`);
                return employee.hourBalance; // Retorna saldo atual sem modificar
            }


            // Define o início e fim do dia
            const dayStart = new Date(date);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(dayStart);
            dayEnd.setDate(dayStart.getDate() + 1);

            // Busca todos os registros FINALIZADOS (com endTime) para o funcionário naquele dia
            const records = await TimeRecord.findAll({
                where: {
                    employeeId: employeeId,
                    startTime: { // Idealmente, buscar por dia completo
                        [Op.gte]: dayStart,
                        [Op.lt]: dayEnd
                    },
                    endTime: { // Apenas registros com check-out
                        [Op.ne]: null
                    }
                }
            });

            if (records.length === 0) {
                logger.info(`[BalanceService] Nenhum registro finalizado encontrado para Employee ${employeeId} em ${date.toISOString().split('T')[0]}.`);
                // TODO: Considerar se um dia sem registro deve gerar saldo negativo (falta)
                // Por enquanto, não altera o saldo se não houver registro.
                return employee.hourBalance;
            }

            // Calcula o saldo total do dia somando os saldos de cada registro
            // (Normalmente haverá apenas um registro por dia, mas isso cobre casos múltiplos)
            let totalDailyBalance = 0;
            for (const record of records) {
                const dailyBalance = this.calculateDailyBalance(record, employee);
                if (dailyBalance !== null) {
                    totalDailyBalance += dailyBalance;
                }
            }

            // Atualiza o saldo acumulado do funcionário
            // Usar increment para evitar race conditions se rodar concorrentemente (improvável aqui)
            const updatedEmployee = await employee.increment('hourBalance', { by: totalDailyBalance });
            const newBalance = updatedEmployee.hourBalance; // Pega o novo saldo atualizado

            logger.info(`[BalanceService] Saldo atualizado para Employee ${employeeId}. Dia: ${date.toISOString().split('T')[0]}, Saldo do Dia: ${totalDailyBalance.toFixed(2)}, Novo Saldo Acumulado: ${newBalance.toFixed(2)}`);

            return newBalance;

        } catch (error) {
            logger.error(`[BalanceService] Erro ao atualizar saldo para Employee ${employeeId} na data ${date.toISOString()}:`, error);
            return null;
        }
    }

    /**
    * Calcula e retorna o histórico de saldo para um período.
    * @param {number} employeeId
    * @param {Date} startDate
    * @param {Date} endDate
    * @returns {Promise<Array<object>>} Array com { date, workedHours, dailyGoal, dailyBalance }
    */
    async getBalanceHistory(employeeId, startDate, endDate) {
        try {
            const employee = await Employee.findByPk(employeeId);
            if (!employee) throw new Error("Funcionário não encontrado.");

            // Garante que endDate inclua o dia inteiro
            const endOfDay = new Date(endDate);
            endOfDay.setHours(23, 59, 59, 999);

            const records = await TimeRecord.findAll({
                where: {
                    employeeId: employeeId,
                    startTime: {
                        [Op.gte]: startDate,
                        [Op.lte]: endOfDay // Usa lte para incluir o último dia
                    },
                    endTime: { [Op.ne]: null } // Apenas finalizados
                },
                order: [['startTime', 'ASC']] // Ordena do mais antigo para o mais novo
            });

            const history = records.map(record => {
                const dailyGoal = this._calculateDailyGoal(parseFloat(employee.weeklyHours));
                const workedHours = record.totalHours ? parseFloat(record.totalHours) : 0;
                const dailyBalance = this.calculateDailyBalance(record, employee) || 0; // Usa 0 se não puder calcular

                return {
                    id: record.id,
                    date: record.startTime, // Ou formatar a data aqui
                    workedHours: workedHours.toFixed(2),
                    dailyGoal: dailyGoal.toFixed(2),
                    dailyBalance: dailyBalance.toFixed(2),
                    notes: record.notes // Incluir notas se existirem
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