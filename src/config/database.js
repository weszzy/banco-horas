const { Sequelize } = require('sequelize');
require('dotenv').config();
const logger = require('../utils/logger.util');

// Configuração para ambiente de produção (Render) e desenvolvimento
const sequelize = new Sequelize(
  process.env.DATABASE_URL,
  {
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    dialectOptions: {
      ssl: process.env.NODE_ENV === 'production' ? {
        require: true,
        rejectUnauthorized: false
      } : false
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  });

// Testa a conexão ao iniciar
sequelize.authenticate()
  .then(() => logger.info('✅ Banco de dados conectado com sucesso.'))
  .catch(err => logger.error('❌ Falha na conexão com o banco:', err));

  module.exports = { sequelize };