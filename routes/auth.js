const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models/sqlModels');
const logger = require('../logger');

// Реєстрація користувача
router.post('/register', [
    check('name').notEmpty().withMessage('Ім’я є обов’язковим'),
    check('email').isEmail().withMessage('Невірний формат email'),
    check('password').isLength({ min: 6 }).withMessage('Пароль має бути не менше 6 символів'),
    check('role').optional().isIn(['user', 'admin']).withMessage('Роль має бути "user" або "admin"')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password, role } = req.body;

    try {
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: 'Користувач з таким email вже існує' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({ name, email, password: hashedPassword, role: role || 'user' });

        logger.info(`Користувача зареєстровано: ${email}`);
        res.status(201).json({ message: 'Користувач успішно зареєстрований!' });
    } catch (error) {
        logger.error('Помилка при реєстрації:', error);
        res.status(500).json({ error: 'Помилка сервера при реєстрації' });
    }
});

// Вхід користувача
router.post('/login', [
    check('email').isEmail().withMessage('Невірний формат email'),
    check('password').notEmpty().withMessage('Пароль є обов’язковим')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
        const user = await User.findOne({ where: { email } });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: 'Невірний email або пароль' });
        }

        const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
        logger.info(`Користувач увійшов: ${email}`);
        res.json({ message: 'Успішний вхід!', token });
    } catch (error) {
        logger.error('Помилка при вході:', error);
        res.status(500).json({ error: 'Помилка сервера при вході' });
    }
});

module.exports = router;