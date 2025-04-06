const { TimeRecord } = require('../models/time-record.model');
const { Employee } = require('../models/employee.model');
const { Op } = require('sequelize');
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