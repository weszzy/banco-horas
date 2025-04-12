// src/jobs/balanceUpdater.js
const cron = require('node-cron');
const { Employee } = require('../models/employee.model'); // Caminho correto
const BalanceService = require('../services/balance.service'); // Caminho correto
const logger = require('../utils/logger.util'); // Caminho correto
// Importar Sequelize e Op se precisar de transações aqui (opcional para o job)
// const { sequelize } = require('../config/database');

// Agenda a tarefa para rodar todo dia às 02:00 AM (ajuste o horário conforme necessário)
const schedule = '0 2 * * *'; // '0 2 * * *' - Roda às 02:00 todo dia

let isTaskRunning = false; // Flag para evitar execução concorrente

const balanceUpdateTask = cron.schedule(schedule, async () => {
    if (isTaskRunning) {
        logger.warn('[CronJob] Balance update task is already running. Skipping this cycle.');
        return;
    }

    isTaskRunning = true;
    logger.info(`[CronJob] Iniciando atualização diária do saldo de horas (${new Date().toISOString()})...`);

    // Obter a data de ONTEM para recalcular o saldo
    const dateToProcess = new Date();
    dateToProcess.setDate(dateToProcess.getDate() - 1);
    const dateString = dateToProcess.toISOString().split('T')[0]; // Formato YYYY-MM-DD

    // Opcional: Criar uma transação se quiser que TUDO falhe se UM funcionário falhar
    // const transaction = await sequelize.transaction();

    try {
        // Busca todos os funcionários ativos
        const activeEmployees = await Employee.findAll({
            where: { isActive: true },
            // attributes: ['id'], // Só precisamos do ID
            // transaction // Passar a transação se usar
        });

        if (!activeEmployees || activeEmployees.length === 0) {
            logger.info('[CronJob] Nenhum funcionário ativo encontrado para atualizar saldo.');
            isTaskRunning = false;
            // await transaction.commit(); // Commit mesmo se não houver funcionários
            return;
        }

        logger.info(`[CronJob] Processando saldo para ${activeEmployees.length} funcionário(s) referente a ${dateString}...`);

        // Itera e atualiza o saldo para cada funcionário
        let successCount = 0;
        let failureCount = 0;
        for (const employee of activeEmployees) {
            try {
                logger.debug(`[CronJob] Processando Employee ID ${employee.id} para data ${dateString}...`);

                // 1. Calcula o saldo REALIZADO vs META para o dia anterior
                //    calculateDailyBalanceForDate já considera todos os registros finalizados do dia.
                const dailyBalance = await BalanceService.calculateDailyBalanceForDate(
                    employee.id,
                    dateToProcess // Passa o objeto Date
                    //, transaction // Passar a transação se usar
                );

                logger.debug(`[CronJob] Saldo calculado para Employee ID ${employee.id} em ${dateString}: ${dailyBalance}h`);

                // 2. ATUALIZA o saldo acumulado do funcionário SOMANDO o saldo do dia anterior.
                //    Isso corrige possíveis inconsistências ou atualiza saldos de dias não fechados via check-out.
                //    Se o saldo do dia foi 0 (sem trabalho ou meta=trabalho), o delta será 0.
                const updated = await BalanceService.updateAccumulatedBalance(
                    employee.id,
                    dailyBalance // Passa o saldo calculado como delta
                    // , transaction // Passar a transação se usar
                );

                if (updated) {
                    logger.debug(`[CronJob] Saldo acumulado atualizado para Employee ID ${employee.id}.`);
                    successCount++;
                } else {
                    // updateAccumulatedBalance retorna false em caso de erro interno ou func. não encontrado
                    logger.warn(`[CronJob] Falha silenciosa ao atualizar saldo acumulado para Employee ID ${employee.id}. BalanceService.updateAccumulatedBalance retornou false.`);
                    // Não necessariamente um erro que deve parar tudo, mas logar é importante.
                    // A falha pode ser pq o funcionário foi desativado entre o findAll e o update.
                    failureCount++; // Conta como falha para o resumo
                }

                // Pequena pausa para não sobrecarregar (opcional)
                // await new Promise(resolve => setTimeout(resolve, 50));

            } catch (innerError) {
                // Loga erro para funcionário específico mas continua o loop
                logger.error(`[CronJob] Erro ao processar saldo para Employee ID ${employee.id} na data ${dateString}:`, innerError);
                failureCount++;
                // Se estiver usando transação, pode querer revertê-la aqui e parar:
                // await transaction.rollback();
                // throw innerError; // Para parar o job inteiro
            }
        }

        // Se chegou aqui sem lançar erro (e sem transação ou com commit no final)
        // await transaction.commit(); // Commit se usou transação e tudo correu bem

        logger.info(`[CronJob] Atualização diária do saldo de horas concluída para ${dateString}. Sucesso: ${successCount}, Falhas: ${failureCount}.`);

    } catch (error) {
        // Erro GERAL (ex: falha ao buscar funcionários, erro na transação)
        logger.error(`[CronJob] Erro GERAL na tarefa de atualização de saldo para ${dateString}:`, error);
        // try {
        //     if (transaction && !transaction.finished) {
        //         await transaction.rollback();
        //         logger.info('[CronJob] Transação revertida devido a erro geral.');
        //     }
        // } catch (rollbackError) {
        //     logger.error('[CronJob] Erro ao reverter transação:', rollbackError);
        // }
    } finally {
        isTaskRunning = false; // Libera a flag independentemente do resultado
    }
}, {
    scheduled: false, // Não inicia automaticamente ao criar
    timezone: "America/Sao_Paulo" // Defina seu fuso horário
});

// Função para iniciar o job (será chamada em app.js ou server.js)
const startBalanceUpdater = () => {
    if (process.env.ENABLE_CRON_JOBS !== 'false') { // Permite desabilitar via .env
        logger.info(`[CronJob] Agendando tarefa de atualização de saldo para rodar às '${schedule}' (Timezone: ${process.env.TZ || 'America/Sao_Paulo'}).`);
        balanceUpdateTask.start();
    } else {
        logger.info('[CronJob] Atualização automática de saldo desabilitada via ENABLE_CRON_JOBS=false.');
    }
};

module.exports = { startBalanceUpdater };