const { Pool } = require('pg');
require('dotenv').config();

class Database {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
      } : false
    });
  }

  async init() {
    try {
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS funcionarios (
          id SERIAL PRIMARY KEY,
          nome TEXT NOT NULL UNIQUE,
          cargo TEXT NOT NULL DEFAULT 'Colaborador',
          foto_url TEXT DEFAULT '/assets/default-avatar.jpg',
          horas_semanais DECIMAL(10,2) NOT NULL DEFAULT 44.0,
          data_cadastro TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);

      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS registros (
          id SERIAL PRIMARY KEY,
          funcionario_id INTEGER NOT NULL REFERENCES funcionarios(id),
          entrada TIMESTAMP NOT NULL,
          saida_almoco TIMESTAMP,
          retorno_almoco TIMESTAMP,
          saida_final TIMESTAMP,
          horas_trabalhadas DECIMAL(10,2),
          CONSTRAINT registro_valido CHECK (
            (saida_final IS NULL) OR 
            (saida_almoco IS NOT NULL AND retorno_almoco IS NOT NULL)
          )
        )
      `);

      console.log('[DB] Tabelas verificadas/criadas');
    } catch (error) {
      console.error('[DB] Erro na inicialização:', error);
      throw error;
    }
  }

  async query(text, params) {
    const start = Date.now();
    try {
      const res = await this.pool.query(text, params);
      const duration = Date.now() - start;
      console.log(`[DB] Query executada em ${duration}ms`, { text });
      return res;
    } catch (error) {
      console.error('[DB] Erro na query:', { text, error });
      throw error;
    }
  }
}

module.exports = new Database();