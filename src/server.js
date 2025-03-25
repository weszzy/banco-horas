const express = require('express');
const path = require('path');
const registroRoutes = require('./routes/registroRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(express.json());
app.use(express.static(path.join(__dirname, 'views')));

// Rotas
app.use('/api', registroRoutes);

// Rota padrão para o frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// Inicia o servidor
app.listen(PORT, () => {
    console.log(`[Server] Online na porta ${PORT}`);
});