const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const { Book } = require('../models/sqlModels');
const logger = require('../logger');
const { authMiddleware } = require('../middleware/authMiddleware');

// Додати книгу (POST /books) - тільки для авторизованих
router.post('/', 
    authMiddleware, // Додаємо перевірку токена
    [
        check('title').notEmpty().withMessage('Назва книги є обов’язковою'),
        check('author').notEmpty().withMessage('Автор є обов’язковим'),
        check('year').isInt({ min: 0 }).withMessage('Рік має бути додатним числом'),
        check('genre').notEmpty().withMessage('Жанр є обов’язковим')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { title, author, year, genre } = req.body;
        try {
            const book = await Book.create({ title, author, year, genre });
            logger.info(`Книгу додано: ${title} (${author}) користувачем ${req.user.id}`);
            res.json({ message: 'Книгу додано!', book });
        } catch (error) {
            logger.error('Помилка при додаванні книги:', error);
            res.status(500).json({ error: 'Помилка сервера при додаванні книги' });
        }
    }
);

module.exports = router;