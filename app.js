const app = require('./src/server'); // Ajuste o caminho se necessário
const logger = require('./src/utils/logger.util'); // Ajuste o caminho
const { startBalanceUpdater } = require('./src/jobs/balanceUpdater'); // Importa o iniciador do Job

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    logger.info(`✅ Servidor rodando na porta ${PORT}`);

    // Inicia o job agendado APÓS o servidor iniciar com sucesso
    startBalanceUpdater();
});