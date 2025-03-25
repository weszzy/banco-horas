const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

/**
 * Cria tabelas necessárias
 */
const initDB = async () => {
    try {
        // Tabela de funcionários
        await pool.query(`
      CREATE TABLE IF NOT EXISTS funcionarios (
        id SERIAL PRIMARY KEY,
        nome TEXT NOT NULL UNIQUE,
        cargo TEXT,
        foto_url TEXT,
        horas_contrato DECIMAL(10,2) DEFAULT 44.0
      )
    `);

        // Tabela de registros
        await pool.query(`
      CREATE TABLE IF NOT EXISTS registros (
        id SERIAL PRIMARY KEY,
        funcionario_id INTEGER REFERENCES funcionarios(id),
        entrada TIMESTAMP NOT NULL,
        saida_almoco TIMESTAMP,
        retorno_almoco TIMESTAMP,
        saida_final TIMESTAMP
      )
    `);

        console.log('[DB] Tabelas verificadas');
    } catch (err) {
        console.error('[DB] Erro ao criar tabelas:', err);
    }
};

initDB();

module.exports = pool;