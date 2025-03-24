const pool = require('../models/registroModel');

/**
 * Registra a entrada de um funcionário.
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
 * Registra a saída para o almoço.
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
 * Registra o retorno do almoço.
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
 * Registra a saída final do dia.
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
 * Calcula horas trabalhadas com desconto do almoço.
 */
const calcularHorasTrabalhadas = (registro) => {
    if (!registro.saida_final || !registro.saida_almoco || !registro.retorno_almoco) {
        return 0; // Dados incompletos
    }

    const entrada = new Date(registro.entrada);
    const saidaFinal = new Date(registro.saida_final);
    const saidaAlmoco = new Date(registro.saida_almoco);
    const retornoAlmoco = new Date(registro.retorno_almoco);

    // Horas totais no trabalho (em horas)
    const horasTotais = (saidaFinal - entrada) / (1000 * 60 * 60);

    // Tempo de almoço (em horas)
    const horasAlmoco = (retornoAlmoco - saidaAlmoco) / (1000 * 60 * 60);

    // Horas trabalhadas efetivas
    return (horasTotais - horasAlmoco).toFixed(2);
};

module.exports = {
    registrarEntrada,
    registrarSaidaAlmoco,
    registrarRetornoAlmoco,
    registrarSaidaFinal,
    calcularHorasTrabalhadas
};