const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database'); // Confirme o caminho
const bcrypt = require('bcryptjs');

const Employee = sequelize.define('Employee', {
    id: { // Adicionar ID explicitamente é uma boa prática
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    fullName: { // Nome correto do campo
        type: DataTypes.STRING,
        allowNull: false,
        field: 'full_name', // Convenção snake_case para o banco
        validate: {
            notEmpty: { msg: 'Nome completo é obrigatório.' },
            len: {
                args: [3, 100],
                msg: 'Nome completo deve ter entre 3 e 100 caracteres.'
            }
        }
    },
    email: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
        validate: {
            isEmail: { msg: 'Formato de e-mail inválido.' }
        }
    },
    passwordHash: { // Nome correto do campo
        type: DataTypes.STRING,
        allowNull: false,
        field: 'password_hash' // Convenção snake_case para o banco
        // Não adicione validação de tamanho aqui, o hash tem tamanho fixo/variável
    },
    role: {
        type: DataTypes.STRING,
        allowNull: false, // É bom ter um papel padrão, então não deve ser nulo
        defaultValue: 'employee', // Papel padrão
        validate: {
            isIn: { // Garante que o papel seja um dos valores permitidos
                args: [['admin', 'employee', 'manager']], // Sincronizado com validation.middleware
                msg: 'Papel inválido.'
            }
        }
    },
    weeklyHours: {
        type: DataTypes.DECIMAL(10, 2), // DECIMAL é bom para horas (ex: 40.5)
        allowNull: true, // Pode ser nulo se não for obrigatório para todos
        defaultValue: 44.0,
        field: 'weekly_hours', // Convenção snake_case
        validate: {
            min: {
                args: [10],
                msg: 'Carga horária semanal mínima é 10 horas.'
            },
            max: {
                args: [60],
                msg: 'Carga horária semanal máxima é 60 horas.'
            }
        }
    }
}, {
    tableName: 'employees',
    timestamps: true, // Habilita createdAt e updatedAt por padrão
    underscored: true, // Mapeia camelCase para snake_case automaticamente (opcional, mas útil com os 'field' definidos)
    hooks: {
        // Hook para hashear a senha ANTES de criar ou atualizar o funcionário
        beforeSave: async (employee, options) => {
            // Só hashear se a senha foi modificada (ou é nova)
            // `employee.changed('passwordHash')` verifica se o campo foi alterado
            // `employee.isNewRecord` verifica se é um novo registro
            // No seu controller, você passa a senha em texto plano para 'passwordHash'
            // então precisamos garantir que ela seja sempre hasheada se presente.
            // A lógica original está ok se você sempre define `passwordHash` com a senha em texto plano no `create`.
            if (employee.passwordHash && (employee.isNewRecord || employee.changed('passwordHash'))) {
                try {
                    const saltRounds = 10; // Fator de custo para o hash
                    employee.passwordHash = await bcrypt.hash(employee.passwordHash, saltRounds);
                } catch (error) {
                    console.error("Erro ao hashear senha:", error);
                    throw new Error("Erro ao processar a senha."); // Impede salvar se o hash falhar
                }
            }
        }
        // Removido beforeCreate, pois beforeSave cobre criação e atualização
        // beforeCreate: async (employee) => {
        //     if (employee.passwordHash) {
        //         employee.passwordHash = await bcrypt.hash(employee.passwordHash, 10);
        //     }
        // }
    }
});

// Método para verificar senha na instância do modelo
Employee.prototype.verifyPassword = async function (password) {
    // Compara a senha fornecida com o hash armazenado
    // Retorna true se a senha for válida, false caso contrário
    if (!password || !this.passwordHash) {
        return false; // Não pode comparar se um dos dois não existe
    }
    try {
        return await bcrypt.compare(password, this.passwordHash);
    } catch (error) {
        console.error("Erro ao comparar senha:", error);
        return false; // Retorna falso em caso de erro na comparação
    }
};

// Exporta o modelo configurado
module.exports = { Employee };