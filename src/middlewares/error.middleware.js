/**
 * Middleware de tratamento de erros centralizado
 */
function errorHandler(err, req, res, next) {
    console.error('[ERROR]', err.stack);

    // Erros de validação do Sequelize
    if (err.name === 'SequelizeValidationError') {
        return res.status(400).json({
            success: false,
            error: err.errors.map(e => e.message)
        });
    }

    // Erro de autenticação
    if (err.name === 'UnauthorizedError') {
        return res.status(401).json({
            success: false,
            error: 'Token inválido ou expirado'
        });
    }

    // Erro genérico
    res.status(500).json({
        success: false,
        error: process.env.NODE_ENV === 'production'
            ? 'Erro interno no servidor'
            : err.message
    });
}

module.exports = errorHandler;