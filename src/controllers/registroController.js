const pool = require('../models/registroModel');

/**
 * Registra a entrada de um funcionário
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const registrarEntrada = async (req, res) => {
    const { funcionario } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO registros (funcionario, entrada) VALUES ($1, NOW()) RETURNING *',
            [funcionario]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Registra saída para almoço
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const registrarSaidaAlmoco = async (req, res) => {
    const { funcionario } = req.body;
    try {
        const result = await pool.query(
            `UPDATE registros 
             SET saida_almoco = NOW() 
             WHERE funcionario = $1 AND saida_final IS NULL
             RETURNING *`,
            [funcionario]
        );
        res.status(200).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Registra retorno do almoço
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const registrarRetornoAlmoco = async (req, res) => {
    const { funcionario } = req.body;
    try {
        const result = await pool.query(
            `UPDATE registros 
             SET retorno_almoco = NOW() 
             WHERE funcionario = $1 AND saida_final IS NULL
             RETURNING *`,
            [funcionario]
        );
        res.status(200).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Registra saída final
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const registrarSaidaFinal = async (req, res) => {
    const { funcionario } = req.body;
    try {
        const result = await pool.query(
            `UPDATE registros 
             SET saida_final = NOW() 
             WHERE funcionario = $1 AND saida_final IS NULL
             RETURNING *`,
            [funcionario]
        );
        res.status(200).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Lista registros recentes (último de cada funcionário)
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const listarRegistrosRecentes = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT DISTINCT ON (funcionario) *
            FROM registros
            ORDER BY funcionario, entrada DESC
        `);
        res.status(200).json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Lista histórico completo de um funcionário
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const listarHistoricoFuncionario = async (req, res) => {
    const { funcionario } = req.params;
    try {
        const result = await pool.query(
            `SELECT * FROM registros 
             WHERE funcionario = $1 
             ORDER BY entrada DESC`,
            [funcionario]
        );
        res.status(200).json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = {
    registrarEntrada,
    registrarSaidaAlmoco,
    registrarRetornoAlmoco,
    registrarSaidaFinal,
    listarRegistrosRecentes,
    listarHistoricoFuncionario
};