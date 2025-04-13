// src/jobs/balanceUpdater.js
const cron = require('node-cron');
const { Employee } = require('../models/employee.model');
const BalanceService = require('../services/balance.service');
const logger = require('../utils/logger.util');

// --- Configuração do Agendamento ---
// Define quando a tarefa será executada.
// Formato Cron: 'segundo minuto hora dia-do-mes mes dia-da-semana'
// Exemplos:
// '* * * * * *' - Roda a cada segundo (NÃO USAR EM PRODUÇÃO!)
// '0 * * * *'  - Roda a cada minuto (ex: 0 segundos, todo minuto)
// '0 2 * * *'  - Roda todo dia às 02:00 da manhã.
const schedule = '0 2 * * *'; // Executa diariamente às 2 da manhã

// Flag para prevenir execuções múltiplas se a tarefa anterior ainda estiver rodando.
let isTaskRunning = false;

/**
 * Tarefa Agendada (Cron Job):
 * Responsável por recalcular e atualizar o saldo de horas acumulado dos funcionários
 * com base nos registros do dia anterior.
 *
 * Propósito Principal: Garantir a consistência do saldo acumulado, corrigindo eventuais
 * falhas na atualização durante o check-out ou processando dias onde o funcionário
 * pode não ter feito check-out.
 */
const balanceUpdateTask = cron.schedule(schedule, async () => {
    // Verifica se a tarefa já está em execução
    if (isTaskRunning) {
        logger.warn('[CronJob BalanceUpdater] Tarefa já em execução. Pulando este ciclo.');
        return;
    }

    // Marca a tarefa como em execução
    isTaskRunning = true;
    const startTime = Date.now();
    logger.info(`[CronJob BalanceUpdater] Iniciando execução (${new Date().toISOString()})...`);

    // Define a data a ser processada: o dia anterior ao atual.
    const dateToProcess = new Date();
    dateToProcess.setDate(dateToProcess.getDate() - 1);
    const dateString = dateToProcess.toISOString().split('T')[0];

    try {
        // Busca todos os funcionários que estão ATIVOS.
        const activeEmployees = await Employee.findAll({
            where: { isActive: true },
            attributes: ['id'], // Só precisamos do ID para processar
        });

        if (!activeEmployees || activeEmployees.length === 0) {
            logger.info(`[CronJob BalanceUpdater] Nenhum funcionário ativo encontrado para processar na data ${dateString}.`);
            isTaskRunning = false;
            return;
        }

        logger.info(`[CronJob BalanceUpdater] Processando saldo para ${activeEmployees.length} funcionário(s) referente a ${dateString}...`);

        let successCount = 0;
        let failureCount = 0;

        // Itera sobre cada funcionário ativo.
        // Usar um loop `for...of` com `await` dentro é mais seguro para não sobrecarregar
        // o banco de dados do que usar `Promise.all` para muitos funcionários.
        for (const employee of activeEmployees) {
            try {
                // 1. Calcula o saldo LÍQUIDO do funcionário para o dia anterior.
                //    Esta função soma todas as horas trabalhadas finalizadas e subtrai a meta diária.
                const dailyBalance = await BalanceService.calculateDailyBalanceForDate(employee.id, dateToProcess);

                // 2. ATUALIZA o saldo ACUMULADO do funcionário, adicionando o saldo do dia anterior.
                //    A função `updateAccumulatedBalance` usa `increment` e é atômica.
                const updated = await BalanceService.updateAccumulatedBalance(employee.id, dailyBalance);

                if (updated) {
                    // Não precisa logar cada sucesso aqui para não poluir, o debug no service já faz isso.
                    successCount++;
                } else {
                    // Loga se a atualização do saldo falhou (ex: funcionário ficou inativo entre o findAll e o update)
                    logger.warn(`[CronJob BalanceUpdater] Falha silenciosa ao atualizar saldo acumulado para Employee ID ${employee.id} na data ${dateString}.`);
                    failureCount++;
                }
            } catch (innerError) {
                // Captura e loga erros específicos do processamento de UM funcionário, mas continua o loop.
                logger.error(`[CronJob BalanceUpdater] Erro ao processar saldo para Employee ID ${employee.id} na data ${dateString}:`, innerError);
                failureCount++;
            }
        } // Fim do loop for...of

        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);
        logger.info(`[CronJob BalanceUpdater] Execução concluída para ${dateString}. Sucesso: ${successCount}, Falhas: ${failureCount}. Duração: ${duration}s.`);

    } catch (error) {
        // Captura erros GERAIS (ex: falha ao buscar funcionários no DB).
        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);
        logger.error(`[CronJob BalanceUpdater] Erro GERAL na tarefa para ${dateString}. Duração até erro: ${duration}s. Erro:`, error);
    } finally {
        // Libera a flag para permitir a próxima execução agendada.
        isTaskRunning = false;
    }
}, {
    scheduled: false, // A tarefa é criada mas NÃO inicia automaticamente. `startBalanceUpdater` deve ser chamada.
    timezone: "America/Sao_Paulo" // IMPORTANTE: Defina o fuso horário correto para a execução do cron.
});

// Função para iniciar o job (geralmente chamada uma vez na inicialização do servidor)
const startBalanceUpdater = () => {
    // Permite desabilitar o job via variável de ambiente (útil para testes ou ambientes específicos)
    if (process.env.ENABLE_CRON_JOBS !== 'false') {
        logger.info(`[CronJob BalanceUpdater] Agendando tarefa para rodar com schedule '${schedule}' (Timezone: ${process.env.TZ || 'America/Sao_Paulo'}).`);
        balanceUpdateTask.start(); // Inicia o agendamento do cron
        logger.info(`[CronJob BalanceUpdater] Tarefa agendada e iniciada.`);
    } else {
        logger.info('[CronJob BalanceUpdater] Atualização automática de saldo desabilitada via variável de ambiente ENABLE_CRON_JOBS=false.');
    }
};

module.exports = { startBalanceUpdater };