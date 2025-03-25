require('dotenv').config();
const express = require('express');
const path = require('path');
const { initDB } = require('./models/registroModel');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(express.json());
app.use(express.static(path.join(__dirname, 'views')));
app.use('/assets', express.static(path.join(__dirname, 'views', 'assets')));

// Rotas
app.use('/api/funcionarios', require('./routes/funcionarioRoutes'));
app.use('/api/registros', require('./routes/registroRoutes'));

// Rota para o frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// Inicialização
const startServer = async () => {
    try {
        await initDB();
        app.listen(PORT, () => {
            console.log(`Servidor rodando na porta ${PORT}`);
            console.log(`Ambiente: ${process.env.NODE_ENV || 'development'}`);
        });
    } catch (err) {
        console.error('Falha ao iniciar servidor:', err);
        process.exit(1);
    }
};

startServer();