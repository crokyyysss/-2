const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const { Book, Reader, BorrowedBook } = require('../models/sqlModels');
const logger = require('../logger');
const NodeCache = require('node-cache');
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');
const cache = new NodeCache({ stdTTL: 600 });

// Отримати список виданих книг (GET /borrowed) - доступно всім авторизованим
router.get('/', authMiddleware, async (req, res) => {
    try {
        const cacheKey = 'borrowed_books';
        const cachedData = cache.get(cacheKey);
        if (cachedData) {
            return res.json(cachedData);
        }
        const borrowedBooks = await BorrowedBook.findAll({ where: { return_date: null } });
        cache.set(cacheKey, borrowedBooks);
        logger.info(`Список виданих книг отриманий користувачем ${req.user.id}`);
        res.json(borrowedBooks);
    } catch (error) {
        logger.error('Помилка при отриманні виданих книг:', error);
        res.status(500).json({ error: 'Помилка сервера при отриманні виданих книг' });
    }
});

// Видати книгу читачеві (POST /borrow) - тільки авторизованим
router.post('/borrow', 
    authMiddleware,
    [
        check('book_id').isInt().withMessage('book_id має бути числом'),
        check('reader_id').isInt().withMessage('reader_id має бути числом')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { book_id, reader_id } = req.body;
        const borrow_date = new Date();
        try {
            const book = await Book.findByPk(book_id);
            const reader = await Reader.findByPk(reader_id);
            if (!book) return res.status(404).json({ error: 'Книга не знайдена' });
            if (!reader) return res.status(404).json({ error: 'Читач не знайдений' });
            const borrowedBook = await BorrowedBook.create({ book_id, reader_id, borrow_date });
            logger.info(`Книгу видано: book_id=${book_id}, reader_id=${reader_id} користувачем ${req.user.id}`);
            res.json({ message: 'Книгу видано!', borrowedBook });
            cache.del('borrowed_books');
        } catch (error) {
            logger.error('Помилка при видачі книги:', error);
            res.status(500).json({ error: 'Помилка сервера при видачі книги' });
        }
    }
);

// Повернути книгу (PUT /return/:id) - тільки для адміністраторів
router.put('/return/:id', 
    authMiddleware,
    adminMiddleware, // Додаємо перевірку ролі
    [
        check('id').isInt().withMessage('ID має бути числом')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { id } = req.params;
        const return_date = new Date();
        try {
            const borrowedBook = await BorrowedBook.findByPk(id);
            if (!borrowedBook) {
                return res.status(404).json({ error: 'Запис про видачу книги не знайдений' });
            }
            if (borrowedBook.return_date) {
                return res.status(400).json({ error: 'Книга вже повернута' });
            }
            await borrowedBook.update({ return_date });
            logger.info(`Книгу повернено: id=${id} адміністратором ${req.user.id}`);
            res.json({ message: 'Книгу повернено!' });
            cache.del('borrowed_books');
        } catch (error) {
            logger.error('Помилка при поверненні книги:', error);
            res.status(500).json({ error: 'Помилка сервера при поверненні книги' });
        }
    }
);

module.exports = router;