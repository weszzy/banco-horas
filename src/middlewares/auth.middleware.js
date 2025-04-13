// src/middlewares/auth.middleware.js
const jwt = require('jsonwebtoken');
const { sendResponse } = require('../utils/response.util');
const logger = require('../utils/logger.util'); // Adicionar logger para depuração

/**
 * Middleware de Autenticação: Verifica a validade do token JWT.
 * Espera um token no cabeçalho 'Authorization' no formato 'Bearer <token>'.
 * Se o token for válido, anexa o payload decodificado (contendo id, role, etc.)
 * ao objeto `req.user` e chama `next()`.
 * Se o token for inválido, expirado ou ausente, envia uma resposta de erro 401 ou 403.
 */
const authenticate = (req, res, next) => {
    // 1. Extrai o token do cabeçalho Authorization.
    const authHeader = req.headers['authorization'];
    // Verifica se o cabeçalho existe e está no formato 'Bearer token'
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    // 2. Se não houver token, retorna erro 401 (Unauthorized).
    if (!token) {
        logger.debug(`[Auth] Tentativa de acesso sem token à rota: ${req.originalUrl}`);
        return sendResponse(res, 401, 'Acesso negado. Token não fornecido.');
    }

    // 3. Verifica o token usando o segredo JWT do ambiente.
    jwt.verify(token, process.env.JWT_SECRET, (err, decodedPayload) => {
        // Se houver erro na verificação...
        if (err) {
            // Diferencia erro de expiração de outros erros (token malformado, assinatura inválida).
            if (err.name === 'TokenExpiredError') {
                logger.debug(`[Auth] Token expirado para acesso à rota: ${req.originalUrl}`);
                return sendResponse(res, 401, 'Token expirado. Faça login novamente.'); // 401 é mais apropriado para expiração
            } else {
                logger.warn(`[Auth] Token inválido (${err.message}) para acesso à rota: ${req.originalUrl}`);
                return sendResponse(res, 403, 'Token inválido ou corrompido.'); // 403 Forbidden para token inválido
            }
        }

        // 4. Se o token for válido, anexa o payload decodificado a req.user.
        //    Isso torna os dados do usuário (id, role) disponíveis para os próximos middlewares e rotas.
        req.user = decodedPayload;
        logger.debug(`[Auth] Usuário autenticado: ID=${req.user.id}, Role=${req.user.role} para ${req.originalUrl}`);

        // 5. Passa para o próximo middleware ou handler da rota.
        next();
    });
};

/**
 * Middleware Factory de Autorização: Cria um middleware que verifica
 * se o papel (role) do usuário autenticado (`req.user.role`) está
 * incluído na lista de papéis permitidos (`allowedRoles`).
 * DEVE ser usado DEPOIS do middleware `authenticate`.
 *
 * @param {Array<string>} allowedRoles - Um array com os nomes dos papéis permitidos para acessar a rota.
 * @returns {function} O middleware de autorização.
 */
const authorize = (allowedRoles = []) => {
    // Garante que allowedRoles seja sempre um array, mesmo que receba uma string única.
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

    // Retorna a função de middleware real.
    return (req, res, next) => {
        // 1. Verifica se o usuário está autenticado (req.user foi definido por `authenticate`).
        //    Também verifica se req.user contém a propriedade 'role'.
        if (!req.user || !req.user.role) {
            logger.warn(`[Authz] Tentativa de autorização sem usuário autenticado ou sem role para: ${req.originalUrl}`);
            // Retorna 401 se não autenticado, pois a autorização depende da autenticação.
            return sendResponse(res, 401, 'Usuário não autenticado ou sem papel definido para esta operação.');
        }

        // 2. Verifica se o papel do usuário está na lista de papéis permitidos.
        if (!roles.includes(req.user.role)) {
            logger.warn(`[Authz] Acesso negado para Role '${req.user.role}' à rota ${req.originalUrl}. Permitido: ${roles.join(', ')}`);
            // Retorna 403 Forbidden se o usuário está autenticado mas não tem a permissão necessária.
            return sendResponse(res, 403, 'Acesso negado. Você não tem permissão para realizar esta ação.');
        }

        // 3. Se o usuário tem o papel permitido, passa para o próximo middleware/rota.
        logger.debug(`[Authz] Acesso autorizado para Role '${req.user.role}' à rota ${req.originalUrl}.`);
        next();
    };
};

module.exports = { authenticate, authorize };