// src/server.js
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') }); // Carrega .env da raiz
const express = require('express');
const helmet = require('helmet'); // Importa o helmet
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const path = require('path');
const logger = require('./utils/logger.util'); // Logger
const errorHandler = require('./middlewares/error.middleware'); // Handler de erro
const { sequelize } = require('./config/database'); // Instância Sequelize

const app = express();

// --- Confiar no Proxy Reverso (Render) ---
// IMPORTANTE: Definir ANTES de middlewares que usam req.ip ou relacionados (como rate-limit)
// Define 'trust proxy' para que o Express confie no cabeçalho X-Forwarded-For
// enviado por proxies reversos como o do Render, permitindo que req.ip retorne
// o IP original do cliente. O '1' significa confiar no primeiro proxy da cadeia.
app.set('trust proxy', 1);
// Para mais detalhes sobre 'trust proxy', veja: https://expressjs.com/en/guide/behind-proxies.html
logger.info("Configuração 'trust proxy' definida como 1."); // Log para confirmar a configuração

// --- Configuração de Segurança Essencial ---

// Configura o Helmet com uma CSP personalizada para permitir CDNs
app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                ...helmet.contentSecurityPolicy.getDefaultDirectives(), // Começa com os padrões do helmet
                // Permite scripts do próprio domínio ('self') E das CDNs usadas
                "script-src": ["'self'", "code.jquery.com", "cdn.jsdelivr.net"],
                // Permite estilos próprios, inline (Bootstrap pode precisar), e CDNs de CSS
                "style-src": ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net", "cdnjs.cloudflare.com"],
                // Permite fontes próprias e do FontAwesome CDN
                "font-src": ["'self'", "cdnjs.cloudflare.com"],
                // Permite imagens próprias e data URIs (útil para imagens embutidas)
                "img-src": ["'self'", "data:"],
                // Conexões de WebSocket (se usar no futuro)
                // "connect-src": ["'self'"],
            },
        },
        // Outras opções do Helmet podem ser desabilitadas se causarem problemas:
        // crossOriginEmbedderPolicy: false, // Exemplo
        // crossOriginOpenerPolicy: false, // Exemplo
    })
);
logger.info("Middleware Helmet (com CSP customizada) configurado.");

// Configura CORS para permitir origens específicas ou todas
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'], // Métodos HTTP permitidos
    allowedHeaders: ['Content-Type', 'Authorization'] // Cabeçalhos permitidos
}));
logger.info("Middleware CORS configurado.");

// --- Middlewares Globais ---
app.use(express.json({ limit: '10kb' })); // Habilita parsing de JSON no body das requisições
app.use(express.urlencoded({ extended: true, limit: '10kb' })); // Habilita parsing de dados URL-encoded
logger.info("Middlewares express.json e express.urlencoded configurados.");

// --- Limitação de Taxa (Rate Limiting) ---
// Aplica limite de requisições por IP para rotas da API
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // Janela de 15 minutos
    max: 100, // Limite de 100 requisições por IP nesta janela
    message: { success: false, message: 'Muitas requisições originadas deste IP, por favor tente novamente após 15 minutos.' },
    standardHeaders: true, // Usa cabeçalhos padrão `RateLimit-*`
    legacyHeaders: false, // Desabilita cabeçalhos antigos `X-RateLimit-*`
    // keyGenerator é opcional, o padrão usa req.ip (que agora deve ser o correto devido a 'trust proxy')
});
app.use('/api/', apiLimiter); // Aplica o limiter apenas às rotas que começam com /api/
logger.info("Middleware express-rate-limit configurado para rotas /api/.");

// --- Conexão com Banco de Dados ---
// Apenas autentica a conexão na inicialização. Migrations devem ser feitas via CLI.
logger.info("Tentando autenticar conexão com o banco de dados...");
sequelize.authenticate()
    .then(() => logger.info('✅ Conexão com o banco de dados estabelecida com sucesso.'))
    .catch(err => logger.error('❌ Falha ao conectar/autenticar com o banco de dados:', err));
// Removido o bloco sequelize.sync(), assumindo que migrations são usadas no build.

// --- Definição das Rotas da API ---
// Define os endpoints base para cada recurso da API
logger.info("Configurando rotas da API...");
app.use('/api/auth', require('./routes/auth.routes')); // Rotas de autenticação (/api/auth/login)
app.use('/api/employees', require('./routes/employee.routes')); // Rotas de funcionários (/api/employees, /api/employees/:id, etc.)
app.use('/api/time-records', require('./routes/time-record.routes')); // Rotas de ponto (/api/time-records/check-in, etc.)
logger.info("Rotas da API configuradas.");

// --- Servir Arquivos Estáticos do Frontend ---
const frontendDir = path.join(__dirname, 'views'); // Diretório dos arquivos estáticos (HTML, CSS, JS do cliente)
logger.info(`Configurando serviço de arquivos estáticos do diretório: ${frontendDir}`);
// Serve arquivos da pasta 'views' na raiz URL (ex: /style.css busca src/views/style.css)
app.use(express.static(frontendDir));
// Serve arquivos da pasta 'src/views/assets' sob o prefixo de URL '/assets'
// (ex: /assets/company-logo.png busca src/views/assets/company-logo.png)
const assetsDir = path.join(frontendDir, 'assets');
app.use('/assets', express.static(assetsDir));
logger.info(`Configurado para servir assets de: ${assetsDir} sob /assets`);

// --- Rota Catch-all para Single Page Application (SPA) ---
// Se nenhuma rota da API ou arquivo estático corresponder, serve o index.html.
// Isso permite que o roteamento do lado do cliente (se houver) funcione.
logger.info("Configurando rota catch-all para SPA (index.html).");
app.get('*', (req, res, next) => {
    // Ignora rotas que começam com /api/
    if (req.originalUrl.startsWith('/api/')) {
        logger.debug(`[Catch-all] Ignorando rota de API: ${req.originalUrl}`);
        return next(); // Passa para o próximo handler (provavelmente um erro 404 implícito)
    }
    // Ignora requisições que parecem ser para arquivos estáticos (com extensão)
    // Adicionado ignore de query string para evitar falso positivo
    if (path.extname(req.originalUrl).length > 0 && !req.originalUrl.includes('?')) {
        logger.debug(`[Catch-all] Ignorando rota com extensão: ${req.originalUrl}`);
        return next();
    }
    // Serve o arquivo principal do frontend
    logger.info(`[Catch-all] Servindo index.html para: ${req.originalUrl}`);
    res.sendFile(path.join(frontendDir, 'index.html'), (err) => {
        if (err) {
            logger.error(`[Catch-all] Erro ao enviar index.html:`, err);
            next(err); // Passa o erro para o errorHandler
        }
    });
});

// --- Middleware de Tratamento de Erros ---
// Deve ser o ÚLTIMO middleware adicionado com app.use()
logger.info("Configurando middleware de tratamento de erros.");
app.use(errorHandler);

// --- Exporta o app ---
// Permite que app.js (ou testes) importe e use a instância configurada do Express
logger.info("Exportando instância do app Express.");
module.exports = app;