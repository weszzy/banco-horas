// src/seeders/XXXXXXXXXXXXXX-create-admin-user.js
'use strict';
const bcrypt = require('bcryptjs'); // Precisa do bcryptjs

module.exports = {
  async up(queryInterface, Sequelize) {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@exemplo.com'; // Pega do .env ou usa default
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'; // Pega do .env ou usa default
    const saltRounds = 10;

    if (!adminPassword) {
      console.error("Senha do admin não definida. Pulando seed.");
      return;
    }

    const hashedPassword = await bcrypt.hash(adminPassword, saltRounds);

    // Verifica se o admin já existe antes de inserir
    const existingAdmin = await queryInterface.rawSelect('employees', {
      where: { email: adminEmail },
    }, ['id']); // Seleciona apenas o ID

    if (!existingAdmin) {
      console.log(`Criando usuário admin padrão: ${adminEmail}`);
      await queryInterface.bulkInsert('employees', [{
        full_name: 'Administrador Padrão',
        email: adminEmail,
        password_hash: hashedPassword,
        role: 'admin', // Papel de admin
        created_at: new Date(), // Sequelize cuida disso com timestamps: true
        updated_at: new Date()
        // weekly_hours pode usar o default do DB se definido na migration/modelo
      }], {});
    } else {
      console.log(`Usuário admin ${adminEmail} já existe. Pulando seed.`);
    }

  },

  async down(queryInterface, Sequelize) {
    // Remove o usuário admin se o seed for revertido
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@exemplo.com';
    console.log(`Removendo usuário admin: ${adminEmail}`);
    await queryInterface.bulkDelete('employees', { email: adminEmail }, {});
  }
};