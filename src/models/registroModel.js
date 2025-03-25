const { Pool } = require('pg');

/**
 * Configuração da conexão com PostgreSQL
 * @type {Pool}
 */
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

/**
 * Cria/verifica a estrutura da tabela de registros
 * Campos:
 * - id: Identificador único
 * - funcionario: Nome do funcionário
 * - entrada: Timestamp de entrada
 * - saida_almoco: Timestamp de saída para almoço
 * - retorno_almoco: Timestamp de retorno do almoço
 * - saida_final: Timestamp de saída final
 */
const initDB = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS registros (
                id SERIAL PRIMARY KEY,
                funcionario TEXT NOT NULL,
                entrada TIMESTAMP NOT NULL,
                saida_almoco TIMESTAMP,
                retorno_almoco TIMESTAMP,
                saida_final TIMESTAMP
            )
        `);
        console.log('[DB] Tabela de registros verificada');
    } catch (err) {
        console.error('[DB] Erro ao criar tabela:', err);
    }
};

// Inicializa o banco de dados
initDB();

module.exports = pool;