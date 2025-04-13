// config/config.js
// Este arquivo é usado principalmente pelo Sequelize CLI para migrations e seeders.
require('dotenv').config(); // Carrega variáveis do .env

module.exports = {
    development: {
        use_env_variable: "DATABASE_URL", // Indica ao CLI para usar a variável de ambiente DATABASE_URL
        dialect: 'postgres',              // Define explicitamente o dialeto
        // logging: console.log, // Descomente para ver SQL gerado pelo CLI em dev
    },
    test: {
        use_env_variable: "DATABASE_URL_TEST", // Idealmente, use um DB de teste separado
        dialect: 'postgres',
        logging: false,
    },
    production: {
        use_env_variable: "DATABASE_URL", // Usa a variável de ambiente DATABASE_URL
        dialect: 'postgres',              // Define explicitamente o dialeto
        logging: false,                   // Desabilita log SQL em produção
        dialectOptions: {
            ssl: {
                require: true, // Exige SSL para produção
                // IMPORTANTE: Necessário para conectar a bancos em nuvem (Render, Heroku)
                // que podem usar certificados não reconhecidos pela CA padrão do Node.js.
                // Define como `true` se você tiver certeza que o CA do seu DB é confiável.
                rejectUnauthorized: false
            }
        }
        // Adicione outras opções de produção aqui se necessário (ex: pool específico para CLI)
    }
};