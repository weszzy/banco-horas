const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database'); // Confirme o caminho
const { Employee } = require('./employee.model'); // Importar Employee para associação

// Função de validação reutilizável e corrigida
function isDateOrNullOrUndefined(value, fieldName) {
    // Permite explicitamente null ou undefined
    if (value === null || typeof value === 'undefined') {
        return; // Válido
    }
    // Se não for null/undefined, verifica se é uma instância de Date válida
    // ou uma string/número que pode ser convertido para uma Date válida.
    const date = new Date(value);
    if (!(date instanceof Date) || isNaN(date.getTime())) {
        throw new Error(`${fieldName} deve ser uma data válida ou nulo.`);
    }
}

const TimeRecord = sequelize.define('TimeRecord', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    startTime: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'start_time',
        validate: {
            isDate: { msg: 'startTime deve ser uma data válida.' }
        }
    },
    lunchStartTime: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'lunch_start_time',
        validate: {
            // Usa a função de validação corrigida
            isDateOrNullOrUndefined: (value) => isDateOrNullOrUndefined(value, 'lunchStartTime')
        }
    },
    lunchEndTime: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'lunch_end_time',
        validate: {
            // Usa a função de validação corrigida
            isDateOrNullOrUndefined: (value) => isDateOrNullOrUndefined(value, 'lunchEndTime')
        }
    },
    endTime: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'end_time',
        validate: {
            // Usa a função de validação corrigida
            isDateOrNullOrUndefined: (value) => isDateOrNullOrUndefined(value, 'endTime')
        }
    },
    totalHours: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        field: 'total_hours',
        validate: {
            min: {
                args: [0],
                msg: 'Total de horas não pode ser negativo.'
            }
        }
    },
    employeeId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'employee_id',
        references: {
            model: Employee,
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
    }
}, {
    tableName: 'time_records',
    timestamps: true,
    underscored: true,
    hooks: {
        beforeSave: (record, options) => {
            if (record.startTime && record.endTime) {
                const startTime = new Date(record.startTime);
                const endTime = new Date(record.endTime);
                let workDurationMs = endTime.getTime() - startTime.getTime();
                let lunchDurationMs = 0;
                if (record.lunchStartTime && record.lunchEndTime) {
                    const lunchStartTime = new Date(record.lunchStartTime);
                    const lunchEndTime = new Date(record.lunchEndTime);
                    if (lunchEndTime > lunchStartTime) {
                        lunchDurationMs = lunchEndTime.getTime() - lunchStartTime.getTime();
                    } else {
                        console.warn(`Record ID ${record.id || '(new)'}: Lunch end time not after start time.`);
                    }
                }
                const totalWorkMs = workDurationMs - lunchDurationMs;
                record.totalHours = Math.max(0, totalWorkMs / (1000 * 60 * 60)).toFixed(2);
            } else {
                record.totalHours = null;
            }
        }
    }
});

TimeRecord.belongsTo(Employee, { foreignKey: 'employeeId', as: 'employee' });
Employee.hasMany(TimeRecord, { foreignKey: 'employeeId', as: 'timeRecords' });

module.exports = { TimeRecord };