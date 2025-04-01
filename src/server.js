require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const path = require('path');

// Importações com caminhos relativos corretos
const errorHandler = require('./middlewares/error.middleware');
const logger = require('./utils/logger.util');

const app = express();

// ========================
// 1. Configuração Inicial
// ========================
if (process.env.RUN_MIGRATIONS === 'true') {
    const { sequelize } = require('./config/database');

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
// 3. Rotas (Caminhos corrigidos)
// ========================
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/employees', require('./routes/employee.routes'));
app.use('/api/time-records', require('./routes/time-record.routes'));

// ========================
// 4. Servir Frontend
// ========================
app.use(express.static(path.join(__dirname, 'views')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Rota padrão para SPA (Single Page Application)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// ========================
// 5. Manipulação de Erros
// ========================
app.use(errorHandler);

// ========================
// Export e Inicialização
// ========================
module.exports = app;