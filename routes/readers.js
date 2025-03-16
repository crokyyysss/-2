const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const { Reader } = require('../models/sqlModels');
const logger = require('../logger');

// Додати читача (POST /readers)
router.post('/',
    [
        check('name').notEmpty().withMessage('Ім’я читача є обов’язковим'),
        check('email').isEmail().withMessage('Невірний формат email'),
        check('phone').notEmpty().withMessage('Телефон є обов’язковим')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, email, phone } = req.body;
        try {
            const reader = await Reader.create({ name, email, phone });
            logger.info(`Читача додано: ${name}`);
            res.json({ message: 'Читача додано!', reader });
        } catch (error) {
            logger.error('Помилка при додаванні читача:', error);
            res.status(500).json({ error: 'Помилка сервера при додаванні читача' });
        }
    }
);

module.exports = router; 