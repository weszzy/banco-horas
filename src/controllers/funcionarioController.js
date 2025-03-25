const { pool } = require('../models/registroModel');

/**
 * Cadastra um novo funcionário
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const cadastrarFuncionario = async (req, res) => {
    const { nome, cargo, foto_url, horas_semanais } = req.body;

    try {
        const result = await pool.query(
            `INSERT INTO funcionarios 
       (nome, cargo, foto_url, horas_semanais) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
            [nome, cargo, foto_url, horas_semanais]
        );

        res.status(201).json({
            success: true,
            data: result.rows[0]
        });
    } catch (err) {
        if (err.code === '23505') {
            return res.status(400).json({
                success: false,
                error: 'Funcionário já cadastrado'
            });
        }
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
};

/**
 * Obtém todos os funcionários cadastrados
 */
const listarFuncionarios = async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT id, nome, cargo, foto_url 
      FROM funcionarios 
      ORDER BY nome ASC
    `);
        res.status(200).json({
            success: true,
            data: result.rows
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
};

module.exports = {
    cadastrarFuncionario,
    listarFuncionarios
};