'use strict';
const bcrypt = require('bcryptjs');

module.exports = {
  async up(queryInterface, Sequelize) {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@exemplo.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'; // **Use uma senha segura no .env!**
    const saltRounds = 10;

    if (!adminPassword || adminPassword.length < 6) { // Verifica se a senha existe e tem tamanho mínimo
      console.error("Senha do admin não definida ou muito curta. Pulando seed de admin.");
      // Lançar um erro pode ser melhor para interromper o build se o admin for essencial
      // throw new Error("Senha do admin inválida ou não definida no ambiente.");
      return;
    }

    const hashedPassword = await bcrypt.hash(adminPassword, saltRounds);

    // Verifica se o admin já existe
    const existingAdmin = await queryInterface.rawSelect('employees', {
      where: { email: adminEmail },
      plain: true, // Retorna apenas o primeiro resultado ou null
    }, ['id']);

    if (!existingAdmin) {
      console.log(`>>> Criando usuário admin padrão: ${adminEmail}`);
      try {
        await queryInterface.bulkInsert('employees', [{
          full_name: 'Administrador Padrão',
          email: adminEmail,
          password_hash: hashedPassword,
          role: 'admin',
          created_at: new Date(),
          updated_at: new Date()
        }], {});
        console.log('>>> Usuário admin criado com sucesso.');
      } catch (error) {
        console.error('>>> ERRO ao inserir usuário admin:', error);
        throw error; // Interrompe o processo se a inserção falhar
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