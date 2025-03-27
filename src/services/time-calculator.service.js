class TimeCalculator {
    static calculateWorkHours(startTime, endTime, lunchStart, lunchEnd) {
        const workMs = endTime - startTime;
        const lunchMs = lunchEnd - lunchStart;
        return ((workMs - lunchMs) / (1000 * 60 * 60)).toFixed(2);
    }

    static validateRecord(record) {
        if (record.endTime && !record.lunchEndTime) {
            throw new Error('Registro inválido: horário de almoço não registrado.');
        }
    }
}

module.exports = TimeCalculator;