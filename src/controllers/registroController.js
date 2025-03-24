const pool = require('../models/registroModel');

// Registrar entrada de um funcionário
const registrarEntrada = async (req, res) => {
    const { funcionario } = req.body;
    const query = `INSERT INTO registros (funcionario, entrada) VALUES ($1, NOW()) RETURNING *`;
    try {
        const result = await pool.query(query, [funcionario]);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Registrar saída de um funcionário
const registrarSaida = async (req, res) => {
    const { funcionario } = req.body;
    const query = `UPDATE registros SET saida = NOW() WHERE funcionario = $1 AND saida IS NULL RETURNING *`;
    try {
        const result = await pool.query(query, [funcionario]);
        res.status(200).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Listar todos os registros
const listarRegistros = async (req, res) => {
    const query = `SELECT * FROM registros`;
    try {
        const result = await pool.query(query);
        res.status(200).json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { registrarEntrada, registrarSaida, listarRegistros };