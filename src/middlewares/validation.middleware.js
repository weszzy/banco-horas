const { sendResponse } = require('../utils/response.util');

/**
 * Middleware para validar dados de login
 */
const validateLogin = (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return sendResponse(res, 400, 'E-mail e senha são obrigatórios.');
    }

    // Validação de formato de e-mail simples
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return sendResponse(res, 400, 'Formato de e-mail inválido.');
    }

    next();
};

/**
 * Middleware para validar dados do funcionário
 */
const validateEmployee = (req, res, next) => {
    const { fullName, email, password, role } = req.body;

    if (!fullName || !email || !password) {
        return sendResponse(res, 400, 'Nome, e-mail e senha são obrigatórios.');
    }

    if (fullName.length < 3 || fullName.length > 100) {
        return sendResponse(res, 400, 'Nome deve ter entre 3 e 100 caracteres.');
    }

    // Validação de formato de e-mail
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return sendResponse(res, 400, 'Formato de e-mail inválido.');
    }

    // Validação de papel (role)
    const validRoles = ['admin', 'employee', 'manager'];
    if (role && !validRoles.includes(role)) {
        return sendResponse(res, 400, 'Papel inválido. Use admin, employee ou manager.');
    }

    next();
};

/**
 * Middleware para validar dados do registro de ponto
 */
const validateTimeRecord = (req, res, next) => {
    const { employeeId } = req.body;

    if (!employeeId) {
        return sendResponse(res, 400, 'ID do funcionário é obrigatório.');
    }

    next();
};

const validateFuncionario = (req, res, next) => {
    const { nome, email, senha } = req.body;

    if (!nome || nome.length < 3) {
        return res.status(400).json({
            success: false,
            error: 'Nome deve ter pelo menos 3 caracteres'
        });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
        return res.status(400).json({
            success: false,
            error: 'E-mail inválido'
        });
    }

    if (!senha || senha.length < 6) {
        return res.status(400).json({
            success: false,
            error: 'Senha deve ter pelo menos 6 caracteres'
        });
    }

    next();
};

module.exports = {
    validateFuncionario,
    // mantenha as outras validações existentes
};


module.exports = {
    validateLogin,
    validateEmployee,
    validateTimeRecord
};