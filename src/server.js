require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const path = require('path');
const errorHandler = require('./middlewares/error.middleware');
const { errorHandler } = require('./src/middlewares/error.middleware'); 
const logger = require('./src/utils/logger.util');

const app = express();

// ========================
// 1. Configuração Inicial
// ========================
if (process.env.RUN_MIGRATIONS === 'true') {
    const { sequelize } = require('./src/config/database');
    sequelize.sync({ alter: true })
        .then(() => logger.info('✅ Migrações executadas com sucesso'))
        .catch(err => logger.error('❌ Falha nas migrações:', err));
}

// ========================
// 2. Middlewares de Segurança
// ========================
app.use(helmet());
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
}));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// Limitação de taxa (DDoS protection)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Muitas requisições deste IP. Tente novamente mais tarde.'
});
app.use('/api/', limiter);

// ========================
// 3. Rotas (Atualizadas para os novos nomes)
// ========================
app.use('/api/auth', require('./src/routes/auth.routes'));
app.use('/api/employees', require('./src/routes/employee.routes')); // Antigo /funcionarios
app.use('/api/time-records', require('./src/routes/time-record.routes')); // Antigo /registros

// ========================
// 4. Servir Frontend (Novo)
// ========================
app.use(express.static(path.join(__dirname, 'src', 'views')));
app.use('/assets', express.static(path.join(__dirname, 'src', 'assets')));

// Rota padrão para SPA (Single Page Application)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'views', 'index.html'));
});

// ========================
// 5. Manipulação de Erros
// ========================
app.use(errorHandler);

// ========================
// Export e Inicialização
// ========================
module.exports = app;