const { sendResponse } = require('../utils/response.util'); // Confirme o caminho

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

    // Validação básica de senha (ex: comprimento mínimo) - Opcional aqui, mas bom ter
    if (password.length < 6) { // Exemplo: mínimo de 6 caracteres
        return sendResponse(res, 400, 'Senha deve ter pelo menos 6 caracteres.');
    }


    next(); // Dados válidos
};

/**
 * Middleware para validar dados do funcionário (Employee)
 */
const validateEmployee = (req, res, next) => {
    // Usa os nomes de campo corretos: fullName, email, password, role
    const { fullName, email, password, role, weeklyHours } = req.body;

    if (!fullName || !email || !password) {
        // weeklyHours pode ser opcional se tiver default no modelo
        return sendResponse(res, 400, 'Nome completo, e-mail e senha são obrigatórios.');
    }

    if (typeof fullName !== 'string' || fullName.trim().length < 3 || fullName.trim().length > 100) {
        return sendResponse(res, 400, 'Nome completo deve ser um texto entre 3 e 100 caracteres.');
    }

    // Validação de formato de e-mail
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return sendResponse(res, 400, 'Formato de e-mail inválido.');
    }

    // Validação de senha (comprimento mínimo)
    // Idealmente, deveria ter regras mais complexas (maiúscula, número, etc.)
    if (typeof password !== 'string' || password.length < 6) {
        return sendResponse(res, 400, 'Senha deve ter pelo menos 6 caracteres.');
    }


    // Validação de papel (role) - usar os papéis definidos no sistema
    // Certifique-se que estes papéis coincidem com os usados no `authorize` e no frontend
    const validRoles = ['admin', 'employee', 'manager']; // Ajuste conforme necessário
    // Se 'role' não for fornecido, o default do modelo será usado (se houver)
    // Se for fornecido, deve ser válido.
    if (role && !validRoles.includes(role)) {
        return sendResponse(res, 400, `Papel inválido. Papéis válidos são: ${validRoles.join(', ')}.`);
    }

    // Validação opcional para weeklyHours se fornecido
    if (weeklyHours !== undefined) {
        const hours = parseFloat(weeklyHours);
        if (isNaN(hours) || hours < 10 || hours > 60) { // Usar os limites do modelo
            return sendResponse(res, 400, 'Carga horária semanal deve ser um número entre 10 e 60.');
        }
    }


    next(); // Dados válidos
};

/**
 * Middleware para validar dados do registro de ponto (Check-in inicial)
 * Pode não ser necessário se o check-in só precisa do usuário autenticado.
 * Se precisar de dados extras no futuro (ex: localização), pode ser útil.
 */
const validateTimeRecordCheckIn = (req, res, next) => {
    // Exemplo: se precisasse de um ID de dispositivo ou localização
    // const { deviceId } = req.body;
    // if (!deviceId) {
    //     return sendResponse(res, 400, 'ID do dispositivo é obrigatório para check-in.');
    // }

    // Como check-in agora usa req.user.id, este middleware pode não ser necessário
    // a menos que haja outros campos no body.
    next();
};


module.exports = {
    validateLogin,
    validateEmployee,
    validateTimeRecordCheckIn // Exporta a validação de check-in (mesmo que vazia por agora)
    // validateTimeRecord foi renomeado/removido pois check-in/out/lunch têm validações diferentes
};