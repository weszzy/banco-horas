// src/config/database.js
const { Sequelize } = require('sequelize');
require('dotenv').config(); // Garante que .env seja carregado
const logger = require('../utils/logger.util');

// Configuração da instância Sequelize usada pela APLICAÇÃO (diferente do config.js para CLI)
const sequelize = new Sequelize(
  process.env.DATABASE_URL, // URL de conexão do banco de dados (PostgreSQL esperado)
  {
    dialect: 'postgres', // Dialeto explícito
    // Logging SQL: Ativado em desenvolvimento, desativado em outros ambientes para performance/limpeza
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    dialectOptions: {
      // Configuração SSL: Necessária para conexões seguras com bancos de dados em nuvem (Render, Heroku, AWS RDS etc.)
      ssl: process.env.NODE_ENV === 'production' ? {
        require: true, // Exige SSL
        // IMPORTANTE: Necessário para alguns provedores (como Heroku/Render) que usam certificados autoassinados.
        // Em ambientes com CAs confiáveis, pode ser definido como `true`.
        rejectUnauthorized: false
      } : false // Desabilita SSL em ambientes não-produção (ex: local)
    },
    pool: {
      // Configurações do pool de conexões (ajuste conforme necessário)
      max: 5, // Máximo de conexões no pool
      min: 0, // Mínimo de conexões no pool
      acquire: 30000, // Tempo máximo (ms) para tentar obter uma conexão antes de lançar erro
      idle: 10000 // Tempo máximo (ms) que uma conexão pode ficar ociosa antes de ser liberada
    }
  });

// Testa a conexão ao iniciar a aplicação para feedback imediato
sequelize.authenticate()
  .then(() => logger.info('✅ Banco de dados conectado com sucesso (via Sequelize).'))
  .catch(err => logger.error('❌ Falha na conexão com o banco (via Sequelize):', err));

// Exporta a instância configurada para ser usada nos modelos e outras partes da aplicação
module.exports = { sequelize };