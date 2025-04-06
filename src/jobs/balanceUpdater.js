const cron = require('node-cron');
const { Employee } = require('../models/employee.model'); // Caminho correto
const BalanceService = require('../services/balance.service'); // Caminho correto
const logger = require('../utils/logger.util'); // Caminho correto

// Agenda a tarefa para rodar todo dia às 02:00 AM (ajuste o horário conforme necessário)
// Formato Cron: 'segundo minuto hora dia-do-mes mes dia-da-semana'
// '* * * * * *' - Roda a cada segundo (para teste)
// '0 2 * * *' - Roda às 02:00 todo dia
const schedule = '0 2 * * *';

let isTaskRunning = false; // Flag para evitar execução concorrente

const balanceUpdateTask = cron.schedule(schedule, async () => {
    if (isTaskRunning) {
        logger.warn('[CronJob] Balance update task is already running. Skipping this cycle.');
        return;
    }

    isTaskRunning = true;
    logger.info(`[CronJob] Iniciando atualização diária do saldo de horas (${new Date().toISOString()})...`);

    try {
        // Pega a data de ontem para calcular o saldo
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        // Busca todos os funcionários ativos
        const activeEmployees = await Employee.findAll({
            where: { isActive: true }
        });

        if (!activeEmployees || activeEmployees.length === 0) {
            logger.info('[CronJob] Nenhum funcionário ativo encontrado para atualizar saldo.');
            isTaskRunning = false;
            return;
        }

        logger.info(`[CronJob] Atualizando saldo para ${activeEmployees.length} funcionário(s) referente a ${yesterday.toISOString().split('T')[0]}...`);

        // Itera e atualiza o saldo para cada funcionário
        // Usar Promise.all pode sobrecarregar o DB se muitos funcionários, iterar sequencialmente é mais seguro.
        for (const employee of activeEmployees) {
            try {
                await BalanceService.updateEmployeeBalanceForDate(employee.id, yesterday);
                // Pequena pausa para não sobrecarregar (opcional)
                // await new Promise(resolve => setTimeout(resolve, 50));
            } catch (innerError) {
                // Loga erro para funcionário específico mas continua o loop
                logger.error(`[CronJob] Falha ao atualizar saldo para Employee ID ${employee.id}:`, innerError);
            }

        }

        logger.info('[CronJob] Atualização diária do saldo de horas concluída.');

    } catch (error) {
        logger.error('[CronJob] Erro GERAL na tarefa de atualização de saldo:', error);
    } finally {
        isTaskRunning = false; // Libera a flag
    }
}, {
    scheduled: false, // Não inicia automaticamente ao criar
    timezone: "America/Sao_Paulo" // Defina seu fuso horário
});

// Função para iniciar o job (será chamada em app.js ou server.js)
const startBalanceUpdater = () => {
    if (process.env.ENABLE_CRON_JOBS !== 'false') { // Permite desabilitar via .env
        logger.info(`[CronJob] Agendando tarefa de atualização de saldo para rodar às ${schedule} (${process.env.TZ || 'America/Sao_Paulo'}).`);
        balanceUpdateTask.start();
    } else {
        logger.info('[CronJob] Atualização automática de saldo desabilitada via ENABLE_CRON_JOBS=false.');
    }

};

module.exports = { startBalanceUpdater };