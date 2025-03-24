const { Pool } = require('pg');

// Configuração do banco de dados PostgreSQL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL, // String de conexão do Render
    ssl: {
        rejectUnauthorized: false // Necessário para conexão com o Render
    }
});

// Função para criar a tabela de registros
const criarTabela = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS registros (
            id SERIAL PRIMARY KEY,
            funcionario TEXT NOT NULL,
            entrada TIMESTAMP NOT NULL,
            saida TIMESTAMP
        )
    `;
    await pool.query(query);
    console.log('Tabela de registros criada ou já existente.');
};

// Executar a criação da tabela ao iniciar
criarTabela();

module.exports = pool;