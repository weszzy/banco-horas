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

app.set('trust proxy', 1); // Confia no primeiro proxy (Render)
logger.info("Configuração 'trust proxy' definida como 1.");

// --- Configuração de Segurança Essencial ---
app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                ...helmet.contentSecurityPolicy.getDefaultDirectives(),
                // PERMITIR SCRIPTS: Próprio domínio e CDNs necessários
                "script-src": ["'self'", "code.jquery.com", "cdn.jsdelivr.net"],
                // PERMITIR ESTILOS: Próprio domínio, inline (para compatibilidade), e CDNs de CSS
                "style-src": ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net", "cdnjs.cloudflare.com"],
                // PERMITIR FONTES: Próprio domínio e FontAwesome CDN
                "font-src": ["'self'", "cdnjs.cloudflare.com"],
                // --- ALTERAÇÃO AQUI ---
                // PERMITIR IMAGENS: Próprio domínio, data URIs, E o domínio do Twitter (pbs.twimg.com)
                // Adicione outros domínios de imagem aqui se necessário (ex: 'img.seu-storage.com')
                "img-src": ["'self'", "data:", "pbs.twimg.com"],
                // --- ALTERAÇÃO AQUI ---
                // PERMITIR ATRIBUTOS INLINE (como onerror): Adiciona 'unsafe-inline'.
                // ATENÇÃO: Isso é menos seguro. Idealmente, remova handlers inline.
                // Se 'unsafe-inline' não funcionar para atributos, pode precisar remover 'script-src-attr'
                // ou configurá-lo especificamente se o Helmet permitir. Vamos tentar 'unsafe-inline' primeiro
                // no script-src, pois às vezes ele cobre atributos também, dependendo da versão/config.
                // Atualização: Helmet mais recente usa script-src-attr. Vamos tentar permitir unsafe-inline nele.
                "script-src-attr": ["'unsafe-inline'"], // Tenta permitir handlers inline como onerror

                // Manter outras diretivas padrão ou ajustar conforme necessário
                "connect-src": ["'self'"], // Permite fetch para o próprio domínio
            },
        },
        // Desabilitar outros headers se necessário (raramente preciso)
        // crossOriginEmbedderPolicy: false,
        // crossOriginOpenerPolicy: false,
    })
);
logger.info("Middleware Helmet (com CSP atualizada para imagens e atributos) configurado.");


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