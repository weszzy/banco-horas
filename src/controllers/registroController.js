const { Pool } = require('pg');
require('dotenv').config();

/**
 * Configuração do pool de conexões com PostgreSQL
 * @type {Pool}
 */
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

/**
 * Inicializa o banco de dados criando as tabelas necessárias
 */
const initDB = async () => {
    try {
        // Tabela de funcionários
        await pool.query(`
      CREATE TABLE IF NOT EXISTS funcionarios (
        id SERIAL PRIMARY KEY,
        nome TEXT NOT NULL UNIQUE,
        cargo TEXT NOT NULL DEFAULT 'Colaborador',
        foto_url TEXT DEFAULT '/assets/default-avatar.jpg',
        horas_semanais DECIMAL(10,2) NOT NULL DEFAULT 44.0,
        data_cadastro TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

        // Tabela de registros
        await pool.query(`
      CREATE TABLE IF NOT EXISTS registros (
        id SERIAL PRIMARY KEY,
        funcionario_id INTEGER NOT NULL REFERENCES funcionarios(id),
        entrada TIMESTAMP NOT NULL,
        saida_almoco TIMESTAMP,
        retorno_almoco TIMESTAMP,
        saida_final TIMESTAMP,
        horas_trabalhadas DECIMAL(10,2),
        CONSTRAINT registro_completo CHECK (
          (saida_final IS NULL) OR 
          (saida_almoco IS NOT NULL AND retorno_almoco IS NOT NULL)
        )
      )
    `);

        console.log('[DB] Tabelas inicializadas com sucesso');
    } catch (err) {
        console.error('[DB] Erro na inicialização:', err.stack);
        process.exit(1);
    }
};

module.exports = {
    pool,
    initDB
};