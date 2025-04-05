const jwt = require('jsonwebtoken');
const { sendResponse } = require('../utils/response.util'); // Corrigido caminho relativo se server.js estiver na raiz
// Se server.js estiver em src/, o caminho '../utils/response.util' está correto. Assumindo que está em src/.

const authenticate = (req, res, next) => {
    // Prioriza o header Authorization: Bearer TOKEN
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Pega o token do 'Bearer TOKEN'

    if (!token) {
        // Log para depuração (opcional)
        // console.log('Tentativa de acesso sem token:', req.path);
        return sendResponse(res, 401, 'Acesso negado. Token não fornecido.');
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decodedPayload) => {
        if (err) {
            // Log para depuração (opcional)
            // console.log('Erro na verificação do token:', err.message, 'Token:', token);
            // Diferencia erro de expiração de token inválido para melhor feedback (opcional)
            if (err.name === 'TokenExpiredError') {
                return sendResponse(res, 401, 'Token expirado. Faça login novamente.'); // 401 é mais apropriado para expiração
            }
            return sendResponse(res, 403, 'Token inválido.'); // 403 para token que falha na verificação
        }
        // Anexa os dados decodificados (geralmente id, role) ao objeto `req`
        // Usar 'user' é comum, mas 'auth' ou 'tokenPayload' também são opções
        req.user = decodedPayload;
        next(); // Passa para o próximo middleware ou rota
    });
};

// Middleware de autorização baseado em papéis (roles)
const authorize = (allowedRoles = []) => {
    // Garante que allowedRoles seja sempre um array
    if (typeof allowedRoles === 'string') {
        allowedRoles = [allowedRoles];
    }

    return (req, res, next) => {
        // Verifica se o usuário está autenticado (req.user existe)
        if (!req.user || !req.user.role) {
            // Log para depuração (opcional)
            // console.log('Tentativa de autorização sem usuário autenticado ou sem role:', req.path);
            return sendResponse(res, 401, 'Usuário não autenticado ou sem papel definido.');
        }

        // Verifica se o papel do usuário está na lista de papéis permitidos
        if (!allowedRoles.includes(req.user.role)) {
            // Log para depuração (opcional)
            // console.log(`Acesso negado para role '${req.user.role}'. Permitido: ${allowedRoles.join(', ')} Path: ${req.path}`);
            return sendResponse(res, 403, 'Acesso negado. Permissões insuficientes.');
        }
        next(); // Usuário tem a permissão necessária
    };
};

module.exports = { authenticate, authorize };