// config/config.js
require('dotenv').config(); // Carrega variáveis do .env (importante!)

module.exports = {

    production: {
        use_env_variable: "DATABASE_URL",
        dialect: 'postgres',
        logging: false,
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false // Importante para Render/Heroku
            }
        }
    },

    development: {
        use_env_variable: "DATABASE_URL", // Diz ao CLI para usar a variável de ambiente
        dialect: 'postgres',              // **Define explicitamente o dialeto**
        // Opções específicas de desenvolvimento (se houver)
        // logging: console.log, // Exemplo: habilitar log SQL em dev
    },
    test: {
        use_env_variable: "DATABASE_URL", // Ou configure um DB de teste
        dialect: 'postgres',
        logging: false,
    },
    production: {
        use_env_variable: "DATABASE_URL", // Usa a mesma variável de ambiente no Render
        dialect: 'postgres',              // **Define explicitamente o dialeto**
        logging: false,                   // Desabilita log SQL em produção
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false // Necessário para muitos serviços como Render/Heroku
            }
        }
    }
};