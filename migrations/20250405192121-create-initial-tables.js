'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  // Função UP: Executada quando você roda 'db:migrate'
  async up(queryInterface, Sequelize) {
    console.log('>>> Criando tabela employees...');
    await queryInterface.createTable('employees', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      full_name: { // Corresponde a 'fullName' com underscored: true
        type: Sequelize.STRING(100), // Limite de tamanho é bom
        allowNull: false
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      password_hash: { // Corresponde a 'passwordHash'
        type: Sequelize.STRING,
        allowNull: false
      },
      role: {
        type: Sequelize.STRING(50), // Limite de tamanho
        allowNull: false,
        defaultValue: 'employee'
      },
      weekly_hours: { // Corresponde a 'weeklyHours'
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 44.0
      },
      created_at: { // Corresponde a 'createdAt'
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') // Padrão do DB
      },
      updated_at: { // Corresponde a 'updatedAt'
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
    console.log('>>> Tabela employees criada.');

    console.log('>>> Criando tabela time_records...');
    await queryInterface.createTable('time_records', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      start_time: { // Corresponde a 'startTime'
        type: Sequelize.DATE,
        allowNull: false
      },
      lunch_start_time: { // Corresponde a 'lunchStartTime'
        type: Sequelize.DATE,
        allowNull: true // Permite nulo
      },
      lunch_end_time: { // Corresponde a 'lunchEndTime'
        type: Sequelize.DATE,
        allowNull: true
      },
      end_time: { // Corresponde a 'endTime'
        type: Sequelize.DATE,
        allowNull: true
      },
      total_hours: { // Corresponde a 'totalHours'
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      employee_id: { // Corresponde a 'employeeId'
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'employees', // Nome da tabela referenciada
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE' // Ou 'SET NULL' se preferir não deletar os registros
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
    console.log('>>> Tabela time_records criada.');
  },

  // Função DOWN: Executada quando você roda 'db:migrate:undo'
  async down(queryInterface, Sequelize) {
    console.log('>>> Removendo tabela time_records...');
    await queryInterface.dropTable('time_records'); // Ordem reversa da criação
    console.log('>>> Removendo tabela employees...');
    await queryInterface.dropTable('employees');
    console.log('>>> Tabelas removidas.');
  }
};