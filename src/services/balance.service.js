// src/services/balance.service.js
const { TimeRecord } = require('../models/time-record.model');
const { Employee } = require('../models/employee.model');
const { Op, Sequelize } = require('sequelize');
const logger = require('../utils/logger.util');

class BalanceService {

    /**
     * Calcula a meta de horas diárias para um funcionário.
     * ATENÇÃO: Assume uma semana de 5 dias úteis por padrão. Tornar configurável se necessário.
     * @param {number} weeklyHours - Carga horária semanal (ex: 44.0).
     * @returns {number} Meta de horas diárias (ex: 8.80), arredondada para 2 casas decimais. Retorna 0 se entrada inválida.
     */


    _calculateDailyGoal(weeklyHours) {
        const workDaysPerWeek = 5; // TODO: Considerar feriados ou escalas diferentes?
        if (!weeklyHours || weeklyHours <= 0 || workDaysPerWeek <= 0) {
            return 0;
        }
        // Arredonda para 2 casas decimais para consistência nos cálculos de saldo.
        return parseFloat((weeklyHours / workDaysPerWeek).toFixed(2));
    }

    /**
     * Calcula o saldo de horas (trabalhado vs meta diária) para UM ÚNICO registro de ponto FINALIZADO.
     * Útil para exibir o saldo de um registro específico no histórico ou antes de deletar/editar.
     * NÃO representa o saldo total do dia se houver múltiplos registros.
     * @param {object} timeRecord - Instância do modelo TimeRecord (DEVE ter totalHours calculado pelo hook).
     * @param {object} employee - Instância do modelo Employee correspondente (DEVE ter weeklyHours).
     * @returns {number|null} Saldo de horas (positivo/negativo) para ESTE registro, ou null se dados inválidos.
     */

    calculateDailyBalance(timeRecord, employee) {
    if(!timeRecord || !employee) {
    logger.warn(`[BalanceService] Objeto timeRecord ou employee ausente para calculateDailyBalance. Rec ID: ${timeRecord?.id}, Emp ID: ${employee?.id}`);
    return null;
}
// Verifica se weeklyHours existe
if (!employee.weeklyHours) {
    logger.warn(`[BalanceService] weeklyHours ausente para Employee ID ${employee.id} em calculateDailyBalance.`);
    return null;
}
// Verifica se totalHours existe, não é nulo, e pode ser convertido para número
let workedHours = null;
if (timeRecord.totalHours !== null && timeRecord.totalHours !== undefined) {
    workedHours = parseFloat(timeRecord.totalHours); // Tenta converter (string ou número)
    if (isNaN(workedHours)) { // Se não for um número válido após conversão
        logger.warn(`[BalanceService] totalHours ('${timeRecord.totalHours}') inválido (não numérico) para calculateDailyBalance. Rec ID: ${timeRecord.id}`);
        return null; // Retorna null se não for um número válido
    }
} else {
    // Se totalHours for null ou undefined (registro não finalizado), não podemos calcular saldo.
    logger.debug(`[BalanceService] totalHours é null/undefined para calculateDailyBalance. Rec ID: ${timeRecord.id}. Saldo será null.`);
    return null; // Retorna null se não houver horas trabalhadas
}


try {
    const dailyGoal = this._calculateDailyGoal(parseFloat(employee.weeklyHours));

    // Valida se a meta é um número (workedHours já foi validado acima)
    if (isNaN(dailyGoal)) {
        logger.warn(`[BalanceService] Meta diária inválida (NaN) em calculateDailyBalance. Rec ID: ${timeRecord.id}`);
        return null;
    }

    const dailyBalance = workedHours - dailyGoal;
    return parseFloat(dailyBalance.toFixed(2));
} catch (error) {
    logger.error(`[BalanceService] Exceção em calculateDailyBalance. Rec ID: ${timeRecord?.id}`, error);
    return null;
}
}

    /**
     * Calcula o saldo TOTAL de horas (soma das horas trabalhadas vs meta diária)
     * para um funcionário em um dia específico.
     * Considera TODOS os registros de ponto FINALIZADOS daquele dia.
     * Usado pelo Job diário e pelo Check-out para determinar o delta a ser aplicado ao saldo acumulado.
     *
     * @param {number} employeeId - ID do funcionário.
     * @param {Date | string} dateOrDateString - A data para a qual calcular o saldo (objeto Date ou string 'YYYY-MM-DD').
     * @param {Sequelize.Transaction} [transaction] - Transação opcional do Sequelize.
     * @returns {Promise<number>} O saldo LÍQUIDO TOTAL do dia (positivo/negativo, arredondado). Retorna 0 se não houver registros finalizados, funcionário/meta não encontrados, ou em caso de erro.
     */


    async calculateDailyBalanceForDate(employeeId, dateOrDateString, transaction = null) {
    // Converte a entrada para um objeto Date e valida
    const operationDate = new Date(dateOrDateString);
    if (isNaN(operationDate.getTime())) {
        logger.error(`[BalanceService] Data inválida fornecida para calculateDailyBalanceForDate: ${dateOrDateString}`);
        return 0;
    }

    // Define o início e o fim do dia (00:00:00 a 23:59:59.999)
    const dayStart = new Date(operationDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayStart.getDate() + 1); // Início do próximo dia

    const dateStr = dayStart.toISOString().split('T')[0];
    logger.info(`[BalanceService] Calculando saldo para o dia ${dateStr} (Employee ${employeeId})...`);

    try {
        // 1. Busca o funcionário para obter a carga horária semanal e calcular a meta diária.
        const employee = await Employee.findByPk(employeeId, {
            attributes: ['weeklyHours', 'id'], // Pega ID para logs
            transaction
        });
        if (!employee || !employee.weeklyHours) {
            logger.warn(`[BalanceService] Funcionário ${employeeId} ou sua carga horária não encontrados para cálculo do dia ${dateStr}.`);
            return 0; // Não é possível calcular o saldo sem a meta.
        }
        const dailyGoal = this._calculateDailyGoal(parseFloat(employee.weeklyHours));
        logger.debug(`[BalanceService] Meta diária para Employee ${employeeId} em ${dateStr}: ${dailyGoal.toFixed(2)}h`);

        // 2. Busca e SOMA as 'totalHours' de TODOS os registros FINALIZADOS do funcionário no dia especificado.
        const result = await TimeRecord.findOne({
            attributes: [
                // Usa a função de agregação SUM do Sequelize para somar a coluna 'total_hours'
                [Sequelize.fn('SUM', Sequelize.col('total_hours')), 'totalWorkedDay']
            ],
            where: {
                employeeId: employeeId,
                // Filtra registros cujo startTime está DENTRO do dia (>= dayStart E < dayEnd)
                startTime: { [Op.gte]: dayStart, [Op.lt]: dayEnd },
                // Considera APENAS registros finalizados (com endTime preenchido)
                endTime: { [Op.ne]: null }
            },
            // group: ['employee_id'], // Agrupamento necessário para SUM funcionar corretamente
            plain: true, // Retorna apenas o objeto de resultado, não a instância do modelo
            transaction
        });

        // Extrai o total de horas trabalhadas do resultado da query. Se não houver registros, será 0.
        const totalWorkedHoursToday = result && result.getDataValue('totalWorkedDay')
            ? parseFloat(result.getDataValue('totalWorkedDay'))
            : 0;

        // 3. Calcula o saldo líquido do dia: Total trabalhado - Meta diária
        const dailyBalance = totalWorkedHoursToday - dailyGoal;
        // Arredonda para 2 casas decimais
        const roundedDailyBalance = parseFloat(dailyBalance.toFixed(2));

        logger.info(`[BalanceService] Saldo calculado para o dia ${dateStr} (Employee ${employeeId}): Trabalhado=${totalWorkedHoursToday.toFixed(2)}h, Meta=${dailyGoal.toFixed(2)}h, Saldo Dia=${roundedDailyBalance.toFixed(2)}h`);

        return roundedDailyBalance; // Retorna o saldo LÍQUIDO calculado para este dia.

    } catch (error) {
        logger.error(`[BalanceService] Erro ao calcular saldo diário para Employee ${employeeId} na data ${dateStr}:`, error);
        return 0; // Retorna 0 em caso de erro para evitar atualizações incorretas de saldo.
    }
}

    /**
     * Atualiza o saldo ACUMULADO ('hourBalance') de um funcionário,
     * adicionando ou subtraindo um valor delta de forma ATÔMICA.
     * Usa `Employee.increment` para garantir que a operação (leitura + escrita) seja segura contra concorrência.
     *
     * @param {number} employeeId - ID do funcionário.
     * @param {number} balanceDelta - Valor a ser somado ao saldo atual (positivo para adicionar, negativo para subtrair).
     * @param {Sequelize.Transaction} [transaction] - Transação opcional do Sequelize.
     * @returns {Promise<boolean>} True se a atualização foi bem-sucedida (ou delta era 0), false se houve erro, funcionário não encontrado ou inativo.
     */


    async updateAccumulatedBalance(employeeId, balanceDelta, transaction = null) {
    // Valida se o delta é um número
    if (typeof balanceDelta !== 'number' || isNaN(balanceDelta)) {
        logger.error(`[BalanceService] Tentativa de atualizar saldo com delta inválido (${balanceDelta}) para Employee ${employeeId}.`);
        return false;
    }
    // Arredonda o delta para 2 casas decimais antes de aplicar
    const roundedDelta = parseFloat(balanceDelta.toFixed(2));

    // Se o delta for zero, não há necessidade de acessar o banco de dados.
    if (roundedDelta === 0) {
        logger.info(`[BalanceService] Delta de saldo é zero para Employee ${employeeId}. Nenhuma atualização de saldo acumulado necessária.`);
        return true; // Considera sucesso pois não havia nada a fazer.
    }

    logger.info(`[BalanceService] Tentando ATUALIZAR saldo acumulado para Employee ${employeeId} por ${roundedDelta.toFixed(2)}h.`);

    try {
        // IMPORTANTE: Verificar se o funcionário existe e está ativo ANTES de tentar incrementar.
        // Isso evita incrementar o saldo de um funcionário deletado ou inativo.
        const employee = await Employee.findByPk(employeeId, {
            attributes: ['id', 'isActive'], // Apenas os campos necessários
            transaction
        });

        if (!employee) {
            logger.error(`[BalanceService] Funcionário ${employeeId} não encontrado para atualização de saldo acumulado.`);
            return false;
        }
        if (!employee.isActive) {
            // Não é um erro, mas o saldo de funcionários inativos não deve ser atualizado.
            logger.info(`[BalanceService] Funcionário ${employeeId} está inativo. Saldo acumulado não foi atualizado.`);
            return true; // Retorna true, pois a operação foi "bem-sucedida" no sentido de não fazer nada propositalmente.
        }

        // Usa o método `increment` do Sequelize.
        // Ele executa uma query SQL atômica como: UPDATE "employees" SET "hour_balance" = "hour_balance" + <roundedDelta> WHERE "id" = <employeeId>;
        // Isso previne race conditions onde duas operações tentam ler e escrever o saldo ao mesmo tempo.
        const [results] = await Employee.increment(
            { hourBalance: roundedDelta }, // Objeto indicando qual coluna incrementar e por qual valor
            { where: { id: employeeId }, transaction } // Condição e transação opcional
        );

        // O `increment` retorna um array onde o primeiro elemento geralmente indica o número de linhas afetadas
        // (pode variar um pouco entre versões/dialetos). Verificamos se foi > 0.
        // Embora o findByPk já devesse garantir que o funcionário existe, esta é uma verificação adicional.
        if (results === 0 || (Array.isArray(results) && results.length > 0 && results[0]?.rowCount === 0)) {
            logger.warn(`[BalanceService] Comando increment para Employee ${employeeId} (delta: ${roundedDelta}) não afetou nenhuma linha, apesar do funcionário existir e estar ativo. Verifique possíveis problemas.`);
            // Poderia retornar false aqui, mas vamos considerar sucesso se não houve erro SQL.
        }

        logger.info(`[BalanceService] Saldo acumulado de Employee ${employeeId} atualizado com sucesso com delta ${roundedDelta.toFixed(2)}h.`);
        return true; // Sucesso na operação de incremento.

    } catch (error) {
        logger.error(`[BalanceService] Erro CRÍTICO ao ATUALIZAR saldo acumulado para Employee ${employeeId}:`, error);
        return false; // Falha na operação.
    }
}


    /**
     * Busca e formata o histórico de registros de ponto finalizados para um funcionário
     * em um determinado período, incluindo o cálculo do saldo para CADA registro.
     * @param {number} employeeId - ID do funcionário.
     * @param {Date} startDate - Data inicial do período.
     * @param {Date} endDate - Data final do período.
     * @returns {Promise<Array<object>>} Array com objetos formatados: { id, date, workedHours, dailyGoal, dailyBalance, notes? }. Lança erro em caso de falha.
     */


    async getBalanceHistory(employeeId, startDate, endDate) {
    try {
        // Busca o funcionário para obter a carga horária (necessária para calcular a meta diária)
        const employee = await Employee.findByPk(employeeId, { attributes: ['id', 'weeklyHours'] });
        if (!employee) {
            throw new Error("Funcionário não encontrado.");
        }

        // Ajusta a data final para incluir o dia inteiro (até 23:59:59.999)
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);

        // Busca todos os registros de ponto FINALIZADOS dentro do período especificado.
        const records = await TimeRecord.findAll({
            where: {
                employeeId: employeeId,
                // Filtra por startTime dentro do período
                startTime: { [Op.gte]: startDate, [Op.lte]: endOfDay },
                // Apenas registros finalizados (com endTime)
                endTime: { [Op.ne]: null }
            },
            order: [['startTime', 'ASC']] // Ordena do mais antigo para o mais recente
        });

        // Calcula a meta diária uma vez, pois é a mesma para todos os registros do mesmo funcionário.
        const dailyGoal = this._calculateDailyGoal(parseFloat(employee.weeklyHours));

        // Mapeia os registros encontrados para o formato desejado para o frontend.
        const history = records.map(record => {
            // Pega as horas trabalhadas calculadas pelo hook.
            const workedHours = record.totalHours ? parseFloat(record.totalHours) : 0;
            // Calcula o saldo específico DESTE registro usando a função auxiliar.
            // Usa ?? 0 para tratar caso calculateDailyBalance retorne null.
            const dailyBalance = this.calculateDailyBalance(record, employee) ?? 0;

            return {
                id: record.id, // ID do registro de ponto (útil para deleção/edição)
                date: record.startTime, // Data/hora de início do registro
                workedHours: workedHours.toFixed(2), // Horas trabalhadas formatadas
                dailyGoal: dailyGoal.toFixed(2), // Meta diária formatada
                dailyBalance: dailyBalance.toFixed(2), // Saldo (worked - goal) formatado
                notes: record.notes // Inclui notas se existirem no modelo (não existe atualmente)
            };
        });

        return history; // Retorna o array formatado.

    } catch (error) {
        logger.error(`[BalanceService] Erro ao buscar histórico de saldo para Employee ${employeeId}:`, error);
        // Re-lança o erro para que o controller possa capturá-lo e enviar uma resposta apropriada.
        throw error;
    }
}
}


// Exporta uma instância singleton do serviço (padrão comum)
module.exports = new BalanceService();