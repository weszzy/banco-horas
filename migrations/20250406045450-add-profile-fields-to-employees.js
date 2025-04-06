'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('>>> Adicionando colunas de perfil e saldo à tabela employees...');
    // Usar Promise.all para executar adições em paralelo (ligeiramente mais rápido)
    await Promise.all([
      queryInterface.addColumn('employees', 'birth_date', { // Nome da coluna no DB (snake_case)
        type: Sequelize.DATEONLY,
        allowNull: true,
      }),
      queryInterface.addColumn('employees', 'hire_date', {
        type: Sequelize.DATEONLY,
        allowNull: true,
      }),
      queryInterface.addColumn('employees', 'photo_url', {
        type: Sequelize.STRING(2048),
        allowNull: true,
      }),
      queryInterface.addColumn('employees', 'hour_balance', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.0,
      }),
      queryInterface.addColumn('employees', 'is_active', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      }),
      // Tornar weekly_hours não nulo se ainda não for (se você mudou allowNull no modelo)
      queryInterface.changeColumn('employees', 'weekly_hours', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false, // Garante que seja not null
        defaultValue: 44.0
      })
    ]);
    console.log('>>> Colunas adicionadas a employees.');
  },

  async down(queryInterface, Sequelize) {
    console.log('>>> Removendo colunas de perfil e saldo da tabela employees...');
    // Usar Promise.all para remover em paralelo
    await Promise.all([
      queryInterface.removeColumn('employees', 'birth_date'),
      queryInterface.removeColumn('employees', 'hire_date'),
      queryInterface.removeColumn('employees', 'photo_url'),
      queryInterface.removeColumn('employees', 'hour_balance'),
      queryInterface.removeColumn('employees', 'is_active'),
      // Reverter weekly_hours para permitir nulo se necessário
      // queryInterface.changeColumn('employees', 'weekly_hours', {
      //   type: Sequelize.DECIMAL(10, 2),
      //   allowNull: true, // Se antes era permitido
      //   defaultValue: 44.0
      // })
    ]);
    console.log('>>> Colunas removidas de employees.');
  }
};