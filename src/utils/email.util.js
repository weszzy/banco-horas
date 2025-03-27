const nodemailer = require('nodemailer');
const logger = require('./logger.util');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

async function sendEmail(to, subject, text) {
    try {
        await transporter.sendMail({
            from: `"Banco de Horas" <${process.env.SMTP_FROM}>`,
            to,
            subject,
            text
        });
        logger.info(`E-mail enviado para ${to}`);
    } catch (error) {
        logger.error('Falha ao enviar e-mail:', error);
    }
}

module.exports = { sendEmail };