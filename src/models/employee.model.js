const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database'); // Confirme o caminho
const bcrypt = require('bcryptjs');

const Employee = sequelize.define('Employee', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    fullName: {
        type: DataTypes.STRING(100), // Adicionado limite
        allowNull: false,
        field: 'full_name',
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
    passwordHash: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'password_hash'
    },
    role: {
        type: DataTypes.STRING(50), // Adicionado limite
        allowNull: false,
        defaultValue: 'employee',
        validate: {
            isIn: {
                args: [['admin', 'employee', 'manager']],
                msg: 'Papel inválido. Use admin, employee ou manager.'
            }
        }
    },
    weeklyHours: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false, // Tornar obrigatório ter uma carga horária definida
        defaultValue: 44.0,
        field: 'weekly_hours',
        validate: {
            min: { args: [10], msg: 'Carga horária semanal mínima é 10 horas.' },
            max: { args: [60], msg: 'Carga horária semanal máxima é 60 horas.' },
            notNull: { msg: 'Carga horária semanal é obrigatória.' } // Validação explícita
        }
    },
    // --- Novos Campos ---
    birthDate: {
        type: DataTypes.DATEONLY, // Usar DATEONLY para não armazenar hora/fuso
        allowNull: true,          // Pode ser opcional
        field: 'birth_date'
    },
    hireDate: {
        type: DataTypes.DATEONLY, // Usar DATEONLY
        allowNull: true,          // Pode ser opcional
        field: 'hire_date'
    },
    photoUrl: {
        type: DataTypes.STRING(2048), // URL pode ser longa
        allowNull: true,
        field: 'photo_url',
        validate: {
            isUrl: { msg: 'URL da foto inválida.' } // Valida se é uma URL (opcional)
        }
    },
    hourBalance: {
        type: DataTypes.DECIMAL(10, 2), // Saldo pode ser negativo
        allowNull: false,
        defaultValue: 0.0,
        field: 'hour_balance'
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true, // Funcionário começa ativo
        field: 'is_active'
    }
    // createdAt e updatedAt são adicionados automaticamente por timestamps: true
}, {
    tableName: 'employees',
    timestamps: true,
    underscored: true, // Mapeia camelCase (ex: weeklyHours) para snake_case (ex: weekly_hours)
    hooks: {
        beforeSave: async (employee, options) => {
            // Hashear senha apenas se for nova ou modificada
            if (employee.changed('passwordHash') || employee.isNewRecord) {
                // Verifica se o valor não é nulo ou vazio antes de hashear
                if (employee.passwordHash) {
                    try {
                        const saltRounds = 10;
                        employee.passwordHash = await bcrypt.hash(employee.passwordHash, saltRounds);
                    } catch (error) {
                        console.error("Erro ao hashear senha:", error);
                        throw new Error("Erro ao processar a senha.");
                    }
                } else {
                    // Lançar erro se tentar salvar senha vazia (se for obrigatória)
                    if (employee.isNewRecord) throw new Error("Senha é obrigatória para novo funcionário.");
                    // Se for update, não faz nada (assume que não quer mudar a senha)
                }
            }
        }
    }
});

// Método para verificar senha (mantido)
Employee.prototype.verifyPassword = async function (password) {
    if (!password || !this.passwordHash) return false;
    try {
        return await bcrypt.compare(password, this.passwordHash);
    } catch (error) {
        console.error("Erro ao comparar senha:", error);
        return false;
    }
};

// Relação com TimeRecord (mantida)
// Employee.hasMany(TimeRecord, { foreignKey: 'employeeId', as: 'timeRecords' }); // Definido no time-record.model.js

// Exporta o modelo configurado
module.exports = { Employee };