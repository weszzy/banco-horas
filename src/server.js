// src/server.js
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') }); // Carrega variáveis de ambiente do .env na raiz
const express = require('express');
const helmet = require('helmet'); // Helmet ajuda a proteger o app configurando vários cabeçalhos HTTP
const rateLimit = require('express-rate-limit'); // Limita a taxa de requisições para prevenir ataques de força bruta/DoS
const cors = require('cors'); // Habilita Cross-Origin Resource Sharing
const path = require('path');
const logger = require('./utils/logger.util'); // Winston logger
const errorHandler = require('./middlewares/error.middleware'); // Middleware de tratamento de erro centralizado
const { sequelize } = require('./config/database'); // Instância do Sequelize para conexão DB

const app = express();

// --- Configurações de Confiança e Proxy ---
// Necessário se a aplicação estiver atrás de um proxy reverso (como Nginx, Heroku, Render)
// Confia no primeiro proxy na cadeia (identificado pelo cabeçalho X-Forwarded-For)
// Essencial para que middlewares como rate-limit obtenham o IP correto do cliente.
app.set('trust proxy', 1);
logger.info("Configuração 'trust proxy' definida como 1.");

// --- Middlewares de Segurança Essenciais ---
// Helmet aplica padrões de segurança, incluindo Content-Security-Policy (CSP)
app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                ...helmet.contentSecurityPolicy.getDefaultDirectives(), // Usa os padrões do Helmet
                // Permissões específicas para o frontend servido:
                "script-src": ["'self'", "code.jquery.com", "cdn.jsdelivr.net"], // Scripts do próprio domínio e CDNs confiáveis
                "style-src": ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net", "cdnjs.cloudflare.com"], // Estilos do próprio domínio, inline (para compatibilidade legada/bootstrap) e CDNs
                "font-src": ["'self'", "cdnjs.cloudflare.com"], // Fontes do próprio domínio e FontAwesome CDN
                "img-src": ["'self'", "data:", "pbs.twimg.com"], // Imagens: próprio domínio, data URIs, e exemplo (Twitter) - Adicionar outros CDNs/Storage se necessário
                // PERIGO: 'unsafe-inline' para atributos como 'onerror'.
                // Idealmente, eventos inline devem ser removidos e adicionados via JS.
                // Necessário aqui devido ao `onerror` na logo no HTML.
                "script-src-attr": ["'unsafe-inline'"],
                "connect-src": ["'self'"], // Permite requisições (fetch/XHR) apenas para o próprio domínio (API)
            },
        },
        // Outras configurações do Helmet (raramente precisam ser desabilitadas)
        // crossOriginEmbedderPolicy: false,
        // crossOriginOpenerPolicy: false,
    })
);
logger.info("Middleware Helmet (com CSP customizado) configurado.");


// --- Middleware CORS ---
// Configura quais origens externas podem acessar a API.
// Usa variável de ambiente `ALLOWED_ORIGINS` (separadas por vírgula) ou '*' para permitir todas (inseguro em produção!).
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'], // Métodos HTTP permitidos
    allowedHeaders: ['Content-Type', 'Authorization'] // Cabeçalhos permitidos nas requisições
}));
logger.info(`Middleware CORS configurado. Origens permitidas: ${process.env.ALLOWED_ORIGINS || '*'}`);

// --- Middlewares Globais de Parsing ---
// Habilita parsing de JSON no corpo das requisições (limitado a 10kb)
app.use(express.json({ limit: '10kb' }));
// Habilita parsing de dados URL-encoded (ex: formulários HTML, limitado a 10kb)
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
logger.info("Middlewares express.json e express.urlencoded configurados.");

// --- Middleware de Limitação de Taxa (Rate Limiting) ---
// Protege contra requisições excessivas de um mesmo IP.
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // Janela de tempo: 15 minutos
    max: 100, // Limite: 100 requisições por IP dentro da janela
    message: { success: false, message: 'Muitas requisições originadas deste IP, por favor tente novamente após 15 minutos.' },
    standardHeaders: true, // Retorna informações do limite nos cabeçalhos `RateLimit-*`
    legacyHeaders: false, // Desabilita cabeçalhos antigos `X-RateLimit-*`
    // keyGenerator: (req) => req.ip // O padrão já usa req.ip, que é ajustado pelo 'trust proxy'
});
// Aplica o limiter APENAS às rotas que começam com /api/
app.use('/api/', apiLimiter);
logger.info("Middleware express-rate-limit configurado para rotas /api/.");

// --- Conexão com Banco de Dados (Autenticação Inicial) ---
// Apenas verifica se a conexão com o DB pode ser estabelecida ao iniciar.
// As migrações devem ser gerenciadas via Sequelize CLI (`npm run migrate`).
logger.info("Tentando autenticar conexão com o banco de dados...");
sequelize.authenticate()
    .then(() => logger.info('✅ Conexão com o banco de dados estabelecida com sucesso.'))
    .catch(err => {
        logger.error('❌ Falha CRÍTICA ao conectar/autenticar com o banco de dados:', err);
        // Considerar encerrar o processo se a conexão com o DB for essencial para iniciar
        // process.exit(1);
    });
// Removido sequelize.sync() - NUNCA usar sync em produção com migrations.

// --- Definição das Rotas da API ---
// Agrupa as rotas por recurso, prefixando-as com /api/
logger.info("Configurando rotas da API...");
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/employees', require('./routes/employee.routes'));
app.use('/api/time-records', require('./routes/time-record.routes'));
logger.info("Rotas da API configuradas.");

// --- Servir Arquivos Estáticos do Frontend ---
const frontendDir = path.join(__dirname, 'views'); // Diretório base do frontend
logger.info(`Configurando serviço de arquivos estáticos do diretório: ${frontendDir}`);
// Serve arquivos da pasta 'views' diretamente na raiz URL (ex: /style.css)
app.use(express.static(frontendDir));
// Serve arquivos da subpasta 'assets' sob o prefixo de URL '/assets' (ex: /assets/logo.png)
const assetsDir = path.join(frontendDir, 'assets');
app.use('/assets', express.static(assetsDir));
logger.info(`Configurado para servir assets de: ${assetsDir} sob /assets`);

// --- Rota Catch-all para Single Page Application (SPA) ---
// Se nenhuma rota da API ou arquivo estático correspondeu acima, esta rota é acionada.
// Essencial para SPAs (React, Vue, Angular) onde o roteamento é feito no cliente.
// Serve o index.html principal, permitindo que o JS do frontend carregue e controle a rota.
logger.info("Configurando rota catch-all para SPA (servindo index.html).");
app.get('*', (req, res, next) => {
    // 1. Ignora explicitamente requisições para a API (elas já deveriam ter sido tratadas)
    if (req.originalUrl.startsWith('/api/')) {
        logger.debug(`[Catch-all] Ignorando rota de API não encontrada: ${req.originalUrl}`);
        return next(); // Passa para o próximo handler (provavelmente o 404 implícito do Express ou o errorHandler)
    }
    // 2. Ignora requisições que parecem ser para arquivos com extensão (ex: /some/file.txt)
    //    e que não contenham query strings (para evitar falsos positivos com URLs como /?param=val.ext)
    //    Isso previne que a SPA tente tratar requisições para arquivos não encontrados.
    if (path.extname(req.originalUrl).length > 0 && !req.originalUrl.includes('?')) {
        logger.debug(`[Catch-all] Ignorando rota com extensão não encontrada: ${req.originalUrl}`);
        return next();
    }

    // 3. Serve o arquivo principal do frontend (index.html)
    logger.info(`[Catch-all] Rota não encontrada, servindo index.html para: ${req.originalUrl}`);
    res.sendFile(path.join(frontendDir, 'index.html'), (err) => {
        // Se houver erro ao enviar o index.html (ex: arquivo não existe), passa para o errorHandler.
        if (err) {
            logger.error(`[Catch-all] Erro ao enviar index.html:`, err);
            next(err);
        }
    });
});

// --- Middleware de Tratamento de Erros ---
// Deve ser o ÚLTIMO middleware adicionado com app.use().
// Ele captura erros passados por `next(err)` ou erros síncronos nas rotas.
logger.info("Configurando middleware de tratamento de erros.");
app.use(errorHandler);

// --- Exporta o app configurado ---
// Permite que app.js (ou testes) importe e use esta instância do Express.
logger.info("Exportando instância do app Express.");
module.exports = app;