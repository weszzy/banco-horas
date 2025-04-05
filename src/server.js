require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') }); // Carrega .env da raiz do projeto
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const path = require('path');
const logger = require('./utils/logger.util'); // Caminho relativo correto dentro de src/
const errorHandler = require('./middlewares/error.middleware'); // Caminho relativo correto dentro de src/
const { sequelize } = require('./config/database'); // Caminho relativo correto dentro de src/

// --- Inicialização do App Express ---
const app = express();

// --- Configuração de Segurança Essencial ---
app.use(helmet()); // Define vários cabeçalhos HTTP de segurança
app.use(cors({ // Habilita Cross-Origin Resource Sharing
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*', // Permite origens configuradas ou todas
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'], // Métodos permitidos
    allowedHeaders: ['Content-Type', 'Authorization'] // Cabeçalhos permitidos nas requisições
}));

// --- Middlewares Globais ---
app.use(express.json({ limit: '10kb' })); // Parseia JSON bodies (com limite de tamanho)
app.use(express.urlencoded({ extended: true, limit: '10kb' })); // Parseia URL-encoded bodies

// Limitação de Taxa (Rate Limiting) - Aplicado a todas as rotas /api/
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // Limita cada IP a 100 requisições por janela
    message: { success: false, message: 'Muitas requisições originadas deste IP, por favor tente novamente após 15 minutos.' },
    standardHeaders: true, // Retorna info do rate limit nos headers `RateLimit-*`
    legacyHeaders: false, // Desabilita os headers `X-RateLimit-*` (legados)
});
app.use('/api/', apiLimiter); // Aplica apenas às rotas da API

// --- Conexão com Banco e Migrações (Opcional no início) ---
// É melhor rodar migrações via script CLI (npm run migrate) antes de iniciar o servidor.
// Mas se precisar rodar na inicialização:
if (process.env.RUN_MIGRATIONS === 'true') {
    sequelize.sync({ alter: true }) // 'alter: true' pode ser perigoso em produção! Use 'force: false' e migrações.
        .then(() => logger.info('🔄 Sincronização (alter: true) com banco de dados concluída.'))
        .catch(err => logger.error('❌ Falha na sincronização com banco de dados:', err));
} else {
    // Apenas testa a conexão se não for sincronizar
    sequelize.authenticate()
        .then(() => logger.info('✅ Conexão com o banco de dados estabelecida com sucesso.'))
        .catch(err => logger.error('❌ Falha ao conectar com o banco de dados:', err));
}


// --- Definição das Rotas da API ---
// Adiciona um prefixo global /api para clareza
app.use('/api/auth', require('./routes/auth.routes')); // Rotas de autenticação
app.use('/api/employees', require('./routes/employee.routes')); // Rotas de funcionários (padronizado)
app.use('/api/time-records', require('./routes/time-record.routes')); // Rotas de registro de ponto

// REMOVIDO: Rota para funcionário (usar /api/employees)
// app.use('/api/funcionarios', require('./routes/funcionario.routes'));


// --- Servir Arquivos Estáticos do Frontend ---
// Define o diretório onde estão os arquivos HTML, CSS, JS do frontend
const frontendDir = path.join(__dirname, 'views'); // __dirname aponta para src/
app.use(express.static(frontendDir));

// Servir assets (imagens, etc.) que podem estar em outra pasta
// Se 'assets' está dentro de 'views', a linha acima já cobre.
// Se 'assets' está na raiz do projeto, use: path.join(__dirname, '../assets')
// Se 'assets' está dentro de 'src', use: path.join(__dirname, 'assets')
// Assumindo que está dentro de src/views:
// app.use('/assets', express.static(path.join(frontendDir, 'assets'))); // Ou ajuste o caminho se necessário


// --- Rota Catch-all para Single Page Application (SPA) ---
// Se o frontend for uma SPA (React, Vue, Angular), esta rota garante que o index.html
// seja servido para qualquer rota não correspondida pelas APIs ou arquivos estáticos,
// permitindo que o roteamento do lado do cliente funcione.
app.get('*', (req, res, next) => {
    // Ignora rotas de API para não sobrescrevê-las
    if (req.originalUrl.startsWith('/api/')) {
        return next();
    }
    // Ignora arquivos com extensão (provavelmente assets)
    if (path.extname(req.originalUrl).length > 0) {
        return next();
    }
    // Serve o index.html para rotas do frontend
    res.sendFile(path.join(frontendDir, 'index.html'));
});


// --- Middleware de Tratamento de Erros (Deve ser o último middleware) ---
app.use(errorHandler);

// --- Exporta o app para ser usado em app.js (ou para testes) ---
module.exports = app;