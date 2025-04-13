// src/models/employee.model.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcryptjs');

const Employee = sequelize.define('Employee', {
    // Definições dos campos... (id, fullName, email, etc.)
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
        // NUNCA adicione validações de formato aqui (ex: minLength)
        // A senha original é validada no middleware, aqui só armazenamos o hash.
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
        type: DataTypes.DECIMAL(10, 2), // DECIMAL para precisão financeira/horas
        allowNull: false,
        defaultValue: 44.0,
        field: 'weekly_hours',
        validate: {
            min: { args: [10], msg: 'Carga horária semanal mínima é 10 horas.' },
            max: { args: [60], msg: 'Carga horária semanal máxima é 60 horas.' },
            notNull: { msg: 'Carga horária semanal é obrigatória.' }
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
        type: DataTypes.DECIMAL(10, 2), // Saldo em horas, pode ser negativo
        allowNull: false,
        defaultValue: 0.0,
        field: 'hour_balance'
        // Nenhuma validação min/max aqui, pois o saldo pode variar livremente.
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true, // Funcionário começa ativo
        field: 'is_active'
    }
    // createdAt e updatedAt são adicionados automaticamente por timestamps: true
},
    {
        tableName: 'employees',
        timestamps: true, // Habilita createdAt e updatedAt automaticamente
        underscored: true, // Mapeia camelCase (ex: fullName) para snake_case (ex: full_name) no banco de dados
        hooks: {
            /**
             * Hook (gatilho) do Sequelize executado ANTES de salvar (criar ou atualizar) um Employee.
             * Responsável por gerar o hash da senha SOMENTE se ela for nova ou tiver sido modificada.
             * Isso evita re-hashear a senha a cada atualização de outros campos do funcionário.
             */
            beforeSave: async (employee, options) => {
                // Verifica se o campo 'passwordHash' foi explicitamente modificado OU se é um registro novo.
                if (employee.changed('passwordHash') || employee.isNewRecord) {
                    // Verifica se uma senha foi fornecida (não nula/vazia)
                    if (employee.passwordHash) {
                        try {
                            const saltRounds = 10; // Custo computacional do hash (padrão recomendado)
                            // Gera o hash da senha (que está em texto plano neste momento no campo passwordHash)
                            employee.passwordHash = await bcrypt.hash(employee.passwordHash, saltRounds);
                            // O valor hasheado agora substitui o valor em texto plano antes de salvar no DB.
                        } catch (error) {
                            // Loga o erro e lança um erro para impedir o save se o hash falhar.
                            console.error("Erro ao hashear senha no hook beforeSave:", error);
                            throw new Error("Erro ao processar a senha.");
                        }
                    } else {
                        // Se a senha não foi fornecida (nula/vazia):
                        // - Lança erro se for um NOVO funcionário (senha é obrigatória na criação).
                        // - Se for um UPDATE e a senha veio vazia, não faz nada (assume que não se queria alterar a senha).
                        if (employee.isNewRecord) {
                            throw new Error("Senha é obrigatória para novo funcionário.");
                        }
                        // Se for update e passwordHash for null/undefined/vazio, não fazemos o hash
                        // IMPORTANTE: Isso significa que para REMOVER uma senha (não recomendado), seria necessário outra lógica.
                        // E para ALTERAR a senha, o controller/serviço deve garantir que a NOVA senha seja colocada em `employee.passwordHash` antes do save.
                    }
                }
                // Se a senha não mudou e não é um registro novo, o hook não faz nada.
            }
        }
    });

/**
 * Método de instância para verificar se uma senha fornecida corresponde ao hash armazenado.
 * @param {string} password - A senha em texto plano a ser verificada.
 * @returns {Promise<boolean>} True se a senha corresponder, false caso contrário ou em erro.
 */
Employee.prototype.verifyPassword = async function (password) {
    // Retorna false se a senha fornecida for inválida ou se não houver hash armazenado.
    if (!password || !this.passwordHash) return false;
    try {
        // Compara a senha fornecida com o hash armazenado usando bcrypt.
        return await bcrypt.compare(password, this.passwordHash);
    } catch (error) {
        console.error("Erro ao comparar senha:", error);
        return false; // Retorna false em caso de erro na comparação.
    }
};

// Associação definida no time-record.model.js para evitar dependência circular no require.
// Employee.hasMany(TimeRecord, { foreignKey: 'employeeId', as: 'timeRecords' });

// Exporta o modelo configurado
module.exports = { Employee };