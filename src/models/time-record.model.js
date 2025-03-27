const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TimeRecord = sequelize.define('TimeRecord', {
    startTime: {
        type: DataTypes.DATE,
        allowNull: false,
        validate: {
            isDate: {
                msg: 'startTime deve ser uma data válida'
            }
        },
        field: 'start_time'
    },
    lunchStartTime: {
        type: DataTypes.DATE,
        field: 'lunch_start_time',
        validate: {
            isDateOrNull(value) {
                if (value && !(value instanceof Date)) {
                    throw new Error('lunchStartTime deve ser uma data válida ou nula');
                }
            }
        }
    },
    lunchEndTime: {
        type: DataTypes.DATE,
        field: 'lunch_end_time',
        validate: {
            isDateOrNull(value) {
                if (value && !(value instanceof Date)) {
                    throw new Error('lunchEndTime deve ser uma data válida ou nula');
                }
            }
        }
    },
    endTime: {
        type: DataTypes.DATE,
        field: 'end_time',
        validate: {
            isDateOrNull(value) {
                if (value && !(value instanceof Date)) {
                    throw new Error('endTime deve ser uma data válida ou nula');
                }
            }
        }
    },
    totalHours: {
        type: DataTypes.DECIMAL(10, 2),
        field: 'total_hours',
        validate: {
            min: 0
        }
    },
    employeeId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'employees',
            key: 'id'
        },
        field: 'employee_id'
    }
}, {
    tableName: 'time_records',
    hooks: {
        beforeSave: (record) => {
            if (record.endTime) {
                const lunchDuration = record.lunchEndTime && record.lunchStartTime ?
                    (record.lunchEndTime - record.lunchStartTime) / (1000 * 60 * 60) : 0;
                record.totalHours = ((record.endTime - record.startTime) / (1000 * 60 * 60)) - lunchDuration;
            }
        }
    }
});

module.exports = TimeRecord;