const jwt = require('jsonwebtoken');
const { Employee } = require('../models/employee.model');

class AuthService {
    static async generateToken(employee) {
        return jwt.sign(
            { id: employee.id, role: employee.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );
    }

    static async findEmployeeByEmail(email) {
        return Employee.findOne({ where: { email } });
    }
}

module.exports = AuthService;