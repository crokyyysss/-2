const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    const token = req.header('Authorization')?.split(' ')[1]; // Очікуємо "Bearer <token>"
    if (!token) return res.status(401).json({ error: 'Немає доступу, токен відсутній' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Додаємо розкодовані дані користувача в запит
        next();
    } catch (error) {
        res.status(403).json({ error: 'Невірний або прострочений токен' });
    }
};

const adminMiddleware = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Доступ заборонено, потрібні права адміністратора' });
    }
    next();
};

module.exports = { authMiddleware, adminMiddleware };