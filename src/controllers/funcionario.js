const db = require('../models/database');

class FuncionarioController {
    async cadastrar(req, res) {
        const { nome, cargo, foto_url, horas_semanais } = req.body;

        try {
            const result = await db.query(
                `INSERT INTO funcionarios 
         (nome, cargo, foto_url, horas_semanais) 
         VALUES ($1, $2, $3, $4) 
         RETURNING *`,
                [nome, cargo || 'Colaborador', foto_url, horas_semanais || 44.0]
            );

            res.status(201).json({
                success: true,
                data: result.rows[0]
            });
        } catch (error) {
            if (error.code === '23505') {
                return res.status(400).json({
                    success: false,
                    error: 'Funcionário já cadastrado'
                });
            }
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    async listar(req, res) {
        try {
            const result = await db.query(`
        SELECT id, nome, cargo, foto_url 
        FROM funcionarios 
        ORDER BY nome ASC
      `);
            res.json({
                success: true,
                data: result.rows
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    async obterPorId(req, res) {
        try {
            const { id } = req.params;
            const result = await db.query(
                'SELECT * FROM funcionarios WHERE id = $1',
                [id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Funcionário não encontrado'
                });
            }

            res.json({
                success: true,
                data: result.rows[0]
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
}

module.exports = new FuncionarioController();