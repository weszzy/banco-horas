const jwt = require('jsonwebtoken');
const { sendResponse } = require('../utils/response.util');

const authenticate = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return sendResponse(res, 401, 'Token de acesso não fornecido.');
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return sendResponse(res, 403, 'Token inválido ou expirado.');
        }
        req.user = user;
        next();
    });
};

const authorize = (roles = []) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return sendResponse(res, 403, 'Acesso negado.');
        }
        next();
    };
};

module.exports = { authenticate, authorize };