const { Pool } = require('pg');

/**
 * Configuração do pool de conexão com o PostgreSQL.
 */

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

/**
 * Cria a tabela de registros com campos para controle de almoço.
 */
const criarTabela = async () => {
    const query = `
        CREATE TABLE IF NOT EXISTS registros (
            id SERIAL PRIMARY KEY,
            funcionario TEXT NOT NULL,
            entrada TIMESTAMP NOT NULL,
            saida_almoco TIMESTAMP,
            retorno_almoco TIMESTAMP,
            saida_final TIMESTAMP
        )
    `;
    await pool.query(query);
    console.log('[DB] Tabela de registros verificada/criada.');
};

// Executa a criação da tabela ao iniciar
criarTabela();

module.exports = pool;