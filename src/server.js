require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const express = require('express');
const helmet = require('helmet'); // Importa o helmet
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const path = require('path');
const logger = require('./utils/logger.util');
const errorHandler = require('./middlewares/error.middleware');
const { sequelize } = require('./config/database');

const app = express();

// --- Configuração de Segurança Essencial ---

// Configura o Helmet com uma CSP personalizada
app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                ...helmet.contentSecurityPolicy.getDefaultDirectives(), // Começa com os padrões do helmet
                "script-src": ["'self'", "code.jquery.com", "cdn.jsdelivr.net"], // Permite scripts do próprio domínio E das CDNs
                "style-src": ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net", "cdnjs.cloudflare.com"], // Permite estilos próprios, inline (Bootstrap pode precisar), e CDNs de CSS
                "font-src": ["'self'", "cdnjs.cloudflare.com"], // Permite fontes próprias e do FontAwesome CDN
                // Você pode precisar adicionar 'img-src' se carregar imagens de outras origens
                "img-src": ["'self'", "data:"], // Permite imagens próprias e data URIs
            },
        },
        // Outras configurações do Helmet podem ser ajustadas aqui se necessário
        // Ex: Desabilitar um header específico: crossOriginEmbedderPolicy: false
    })
);


app.use(cors({
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// --- Middlewares Globais ---
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Limitação de Taxa (Rate Limiting)
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100,
    message: { success: false, message: 'Muitas requisições originadas deste IP, por favor tente novamente após 15 minutos.' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', apiLimiter);

// --- Conexão com Banco e Migrações ---
if (process.env.RUN_MIGRATIONS === 'true') {
    sequelize.sync({ alter: true })
        .then(() => logger.info('🔄 Sincronização (alter: true) com banco de dados concluída.'))
        .catch(err => logger.error('❌ Falha na sincronização com banco de dados:', err));
} else {
    sequelize.authenticate()
        .then(() => logger.info('✅ Conexão com o banco de dados estabelecida com sucesso.'))
        .catch(err => logger.error('❌ Falha ao conectar com o banco de dados:', err));
}

// --- Definição das Rotas da API ---
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/employees', require('./routes/employee.routes'));
app.use('/api/time-records', require('./routes/time-record.routes'));

// --- Servir Arquivos Estáticos do Frontend ---
const frontendDir = path.join(__dirname, 'views');
// Serve arquivos da pasta 'views' na raiz URL (/, /style.css, /script.js)
app.use(express.static(frontendDir));
// Serve arquivos da pasta 'src/views/assets' sob o caminho /assets
// Garanta que sua imagem esteja em 'src/views/assets/company-logo.png'
app.use('/assets', express.static(path.join(frontendDir, 'assets')));

// --- Rota Catch-all para Single Page Application (SPA) ---
app.get('*', (req, res, next) => {
    if (req.originalUrl.startsWith('/api/')) { return next(); }
    if (path.extname(req.originalUrl).length > 0 && !req.originalUrl.includes('?')) { return next(); } // Ignora arquivos com extensão
    res.sendFile(path.join(frontendDir, 'index.html'));
});

// --- Middleware de Tratamento de Erros ---
app.use(errorHandler);

// --- Exporta o app ---
module.exports = app;