require('dotenv').config();
const express = require('express');
const path = require('path');
const db = require('./models/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'views')));

// Rotas
app.use('/api/funcionarios', require('./routes/funcionarioRoutes'));
app.use('/api/registros', require('./routes/registroRoutes'));


// Health Check
app.get('/health', async (req, res) => {
    try {
        await db.query('SELECT NOW()');
        res.status(200).json({
            status: 'healthy',
            database: 'connected'
        });
    } catch (error) {
        res.status(500).json({
            status: 'unhealthy',
            database: 'disconnected'
        });
    }
});

// Inicialização
const startServer = async () => {
    try {
        await db.init();

        app.listen(PORT, () => {
            console.log(`🟢 Servidor rodando na porta ${PORT}`);
            console.log(`🔵 Ambiente: ${process.env.NODE_ENV || 'development'}`);
        });
    } catch (error) {
        console.error('🔴 Falha crítica ao iniciar servidor:', error);
        process.exit(1);
    }
};

startServer();