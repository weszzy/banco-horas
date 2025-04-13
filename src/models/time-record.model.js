// src/models/time-record.model.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { Employee } = require('./employee.model');



/**
 * Função de validação customizada para campos de data que podem ser nulos.
 * O validador `isDate` padrão do Sequelize não permite `null`.
 * @param {*} value - O valor a ser validado.
 * @param {string} fieldName - Nome do campo (para mensagem de erro).
 * @throws {Error} Se o valor não for uma data válida (e não for null/undefined).
 */


// Função de validação reutilizável e corrigida
function isDateOrNullOrUndefined(value, fieldName) {
    if (value === null || typeof value === 'undefined') {
        return; // Permite nulo ou indefinido
    }
    // Tenta converter para Date e verifica se é válido
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
            // Usa a função customizada que permite null
            isDateOrNull: (value) => isDateOrNullOrUndefined(value, 'lunchStartTime')
        }
    },
    lunchEndTime: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'lunch_end_time',
        validate: {
            isDateOrNull: (value) => isDateOrNullOrUndefined(value, 'lunchEndTime')
        }
    },
    endTime: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'end_time',
        validate: {
            isDateOrNull: (value) => isDateOrNullOrUndefined(value, 'endTime')
        }
    },
    totalHours: {
        type: DataTypes.DECIMAL(10, 2), // Armazena o total de horas trabalhadas (descontando almoço)
        allowNull: true, // É nulo até o registro ser finalizado (endTime preenchido)
        field: 'total_hours',
        validate: {
            min: { // Garante que não seja negativo
                args: [0],
                msg: 'Total de horas não pode ser negativo.'
            }
        }
    },
    employeeId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'employee_id',
        references: { // Define a chave estrangeira
            model: Employee, // Referencia o modelo Employee
            key: 'id'        // Coluna 'id' da tabela 'employees'
        },
        // Comportamento da chave estrangeira:
        onUpdate: 'CASCADE', // Se o ID do funcionário mudar, atualiza aqui também.
        // ATENÇÃO: Se um funcionário for deletado, TODOS os seus registros de ponto serão deletados.
        // Alternativas: 'SET NULL' (requer allowNull: true) ou 'RESTRICT' (impede deletar funcionário com registros).
        onDelete: 'CASCADE'
    }
}, {
    tableName: 'time_records',
    timestamps: true,
    underscored: true,
    hooks: {
        /**
         * Hook beforeSave: Executado antes de criar ou atualizar um TimeRecord.
         * Calcula automaticamente o campo `totalHours` SE o registro tiver `startTime` e `endTime`.
         * Desconta o tempo de almoço se `lunchStartTime` e `lunchEndTime` estiverem presentes e válidos.
         */
        beforeSave: (record, options) => {
            // Só calcula se tiver início E fim definidos
            if (record.startTime && record.endTime) {
                const startTime = new Date(record.startTime);
                const endTime = new Date(record.endTime);

                // Calcula duração bruta em milissegundos
                let workDurationMs = endTime.getTime() - startTime.getTime();
                let lunchDurationMs = 0;

                // Calcula duração do almoço SE ambos os tempos estiverem definidos E fim > início
                if (record.lunchStartTime && record.lunchEndTime) {
                    const lunchStartTime = new Date(record.lunchStartTime);
                    const lunchEndTime = new Date(record.lunchEndTime);
                    if (lunchEndTime > lunchStartTime) {
                        lunchDurationMs = lunchEndTime.getTime() - lunchStartTime.getTime();
                    } else {
                        // Loga um aviso se os tempos de almoço forem inválidos, mas não impede o save.
                        console.warn(`Record ID ${record.id || '(new)'}: Lunch end time not after start time.`);
                    }
                }

                // Calcula duração líquida (trabalho - almoço) em milissegundos
                const totalWorkMs = workDurationMs - lunchDurationMs;

                // Converte para horas e arredonda para 2 casas decimais. Garante que não seja negativo.
                record.totalHours = Math.max(0, totalWorkMs / (1000 * 60 * 60)).toFixed(2);

            } else {
                // Se o registro não está finalizado (sem endTime), totalHours deve ser null.
                record.totalHours = null;
            }
        }
    }
});

// --- Associações ---
// Define a relação: Um TimeRecord pertence a um Employee
TimeRecord.belongsTo(Employee, { foreignKey: 'employeeId', as: 'employee' });
// Define a relação inversa: Um Employee tem muitos TimeRecords
Employee.hasMany(TimeRecord, { foreignKey: 'employeeId', as: 'timeRecords' });

module.exports = { TimeRecord };