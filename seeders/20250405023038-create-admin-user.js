'use strict';
const bcrypt = require('bcryptjs');

module.exports = {
  async up(queryInterface, Sequelize) {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@exemplo.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const saltRounds = 10;

    if (!adminPassword || adminPassword.length < 6) {
      console.error("Senha do admin inválida ou não definida no ambiente. Pulando seed de admin.");
      return; // Não continua se a senha for inválida
    }

    const hashedPassword = await bcrypt.hash(adminPassword, saltRounds);

    const existingAdmin = await queryInterface.rawSelect('employees', {
      where: { email: adminEmail },
      plain: true,
    }, ['id']);

    if (!existingAdmin) {
      console.log(`>>> Criando usuário admin padrão: ${adminEmail}`);
      try {
        await queryInterface.bulkInsert('employees', [{
          full_name: 'Administrador Padrão',
          email: adminEmail,
          password_hash: hashedPassword,
          role: 'admin',
          weekly_hours: 40.0, // Exemplo de carga horária para admin
          // Valores para os novos campos
          birth_date: null,     // Pode definir ou deixar nulo
          hire_date: new Date(), // Data de hoje como admissão
          photo_url: null,
          hour_balance: 0.0,
          is_active: true,
          // created_at e updated_at serão definidos pelo DB ou Sequelize
          created_at: new Date(),
          updated_at: new Date()
        }], {});
        console.log('>>> Usuário admin criado com sucesso.');
      } catch (error) {
        console.error('>>> ERRO ao inserir usuário admin:', error);
        throw error;
      }
    } else {
      console.log(`>>> Usuário admin ${adminEmail} já existe. Pulando inserção.`);
    }
  },

  async down(queryInterface, Sequelize) {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@exemplo.com';
    console.log(`>>> Removendo usuário admin: ${adminEmail}`);
    await queryInterface.bulkDelete('employees', { email: adminEmail }, {});
  }
};