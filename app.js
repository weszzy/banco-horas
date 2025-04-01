const app = require('./src/server');
const logger = require('./src/utils/logger.util');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    logger.info(`✅ Servidor rodando na porta ${PORT}`);
});