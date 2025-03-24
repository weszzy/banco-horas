const express = require('express');
const path = require('path');
const registroRoutes = require('./routes/registroRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para servir arquivos estáticos
app.use(express.static(path.join(__dirname, 'views')));
app.use(express.json()); // Para processar JSON no corpo das requisições

// Rotas da API
app.use('/api', registroRoutes);

// Iniciar o servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});