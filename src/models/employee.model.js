const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcryptjs');

const Employee = sequelize.define('Employee', {
    fullName: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: { msg: 'Nome completo é obrigatório.' },
            len: [3, 100]
        }
    },
    email: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
        validate: {
            isEmail: true
        }
    },
    passwordHash: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'password_hash'
    },
    role: {
        type: DataTypes.STRING,
        defaultValue: 'employee'
    },
    weeklyHours: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 44.0,
        validate: {
            min: 10,
            max: 60
        },
        field: 'weekly_hours'
    }
}, {
    tableName: 'employees',
    hooks: {
        beforeCreate: async (employee) => {
            if (employee.passwordHash) {
                employee.passwordHash = await bcrypt.hash(employee.passwordHash, 10);
            }
        }
    }
});

// Método para verificar senha
Employee.prototype.verifyPassword = async function (password) {
    return bcrypt.compare(password, this.passwordHash);
};

module.exports = Employee;