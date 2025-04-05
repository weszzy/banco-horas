const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database'); // Confirme o caminho
const { Employee } = require('./employee.model'); // Importar Employee para associação

const TimeRecord = sequelize.define('TimeRecord', {
    id: { // Adicionar ID explicitamente
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
        allowNull: true, // Almoço é opcional ou pode não ter sido registrado ainda
        field: 'lunch_start_time',
        validate: {
            isDateOrNull(value) { // Validador customizado
                if (value !== null && !(value instanceof Date) && isNaN(new Date(value).getTime())) {
                    throw new Error('lunchStartTime deve ser uma data válida ou nulo.');
                }
            }
        }
    },
    lunchEndTime: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'lunch_end_time',
        validate: {
            isDateOrNull(value) { // Validador customizado
                if (value !== null && !(value instanceof Date) && isNaN(new Date(value).getTime())) {
                    throw new Error('lunchEndTime deve ser uma data válida ou nulo.');
                }
            }
        }
    },
    endTime: {
        type: DataTypes.DATE,
        allowNull: true, // Fica nulo até o check-out
        field: 'end_time',
        validate: {
            isDateOrNull(value) { // Validador customizado
                if (value !== null && !(value instanceof Date) && isNaN(new Date(value).getTime())) {
                    throw new Error('endTime deve ser uma data válida ou nulo.');
                }
            }
        }
    },
    totalHours: {
        type: DataTypes.DECIMAL(10, 2), // DECIMAL é bom para horas
        allowNull: true, // Calculado no final, pode ser nulo antes disso
        field: 'total_hours',
        validate: {
            min: {
                args: [0],
                msg: 'Total de horas não pode ser negativo.'
            }
        }
    },
    employeeId: { // Chave estrangeira
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'employee_id',
        references: {
            model: Employee, // Referencia o modelo Employee importado
            key: 'id'
        },
        onUpdate: 'CASCADE', // Opcional: o que fazer se o ID do funcionário mudar
        onDelete: 'CASCADE'  // Opcional: o que fazer se o funcionário for deletado (apagar registros?) ou 'SET NULL'
    }
}, {
    tableName: 'time_records',
    timestamps: true, // Habilita createdAt e updatedAt
    underscored: true, // Mapeia camelCase para snake_case
    hooks: {
        // Hook para calcular as horas totais ANTES de salvar (criação ou atualização)
        beforeSave: (record, options) => {
            // Só calcula se tiver hora de início e fim
            if (record.startTime && record.endTime) {
                // Garante que as datas sejam objetos Date
                const startTime = new Date(record.startTime);
                const endTime = new Date(record.endTime);

                // Calcula a duração do trabalho em milissegundos
                let workDurationMs = endTime.getTime() - startTime.getTime();

                // Calcula a duração do almoço em milissegundos, somente se ambos existirem
                let lunchDurationMs = 0;
                if (record.lunchStartTime && record.lunchEndTime) {
                    const lunchStartTime = new Date(record.lunchStartTime);
                    const lunchEndTime = new Date(record.lunchEndTime);
                    if (lunchEndTime > lunchStartTime) { // Garante que o fim seja depois do início
                        lunchDurationMs = lunchEndTime.getTime() - lunchStartTime.getTime();
                    } else {
                        console.warn(`Registro ID ${record.id}: Horário de fim do almoço (${lunchEndTime}) é anterior ou igual ao início (${lunchStartTime}). Duração do almoço será 0.`);
                    }
                }

                // Calcula o total de horas trabalhadas (subtrai almoço)
                const totalWorkMs = workDurationMs - lunchDurationMs;

                // Converte para horas e arredonda para 2 casas decimais
                // Garante que não seja negativo
                const totalHours = Math.max(0, totalWorkMs / (1000 * 60 * 60)).toFixed(2);
                record.totalHours = totalHours;

            } else {
                // Se não houver hora de fim, totalHours deve ser null ou 0
                record.totalHours = null; // Ou 0, dependendo da regra de negócio
            }
        }
    }
});

// Definindo a Associação (Opcional aqui, mas bom para clareza e Eager Loading)
// TimeRecord pertence a um Employee
TimeRecord.belongsTo(Employee, { foreignKey: 'employeeId', as: 'employee' });
// Employee tem muitos TimeRecords
Employee.hasMany(TimeRecord, { foreignKey: 'employeeId', as: 'timeRecords' });


module.exports = { TimeRecord };