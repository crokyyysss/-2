const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();
const mysqlDB = require('./mysql');
const logger = require('./logger'); // Переносимо імпорт logger на початок
const swaggerUi = require('swagger-ui-express');
const NodeCache = require('node-cache');

// Ініціалізація Express
const app = express();
// Кеш для оптимізації запитів
const cache = new NodeCache({ stdTTL: 600 });

// Middleware
app.use(bodyParser.json());
app.use(cors({
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Документація Swagger
const swaggerDocument = {
    openapi: '3.0.0',
    info: {
        title: 'Library API',
        version: '1.0.0',
        description: 'API для управління бібліотекою'
    },
    paths: {
        '/books': {
            post: {
                summary: 'Додати книгу',
                requestBody: {
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    title: { type: 'string' },
                                    author: { type: 'string' },
                                    year: { type: 'number' },
                                    genre: { type: 'string' }
                                },
                                required: ['title', 'author', 'year', 'genre']
                            }
                        }
                    }
                },
                responses: {
                    '200': { description: 'Книгу додано' },
                    '400': { description: 'Помилка валідації' },
                    '500': { description: 'Помилка сервера' }
                }
            }
        },
        '/readers': {
            post: {
                summary: 'Додати читача',
                requestBody: {
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    name: { type: 'string' },
                                    email: { type: 'string' },
                                    phone: { type: 'string' }
                                },
                                required: ['name', 'email', 'phone']
                            }
                        }
                    }
                },
                responses: {
                    '200': { description: 'Читача додано' },
                    '400': { description: 'Помилка валідації' },
                    '500': { description: 'Помилка сервера' }
                }
            }
        },
        '/borrowed': {
            get: {
                summary: 'Отримати список виданих книг',
                responses: {
                    '200': { description: 'Список виданих книг' },
                    '500': { description: 'Помилка сервера' }
                }
            },
            post: {
                summary: 'Видати книгу читачеві',
                requestBody: {
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    book_id: { type: 'number' },
                                    reader_id: { type: 'number' }
                                },
                                required: ['book_id', 'reader_id']
                            }
                        }
                    }
                },
                responses: {
                    '200': { description: 'Книгу видано' },
                    '400': { description: 'Помилка валідації' },
                    '404': { description: 'Книга або читач не знайдені' },
                    '500': { description: 'Помилка сервера' }
                }
            },
            put: {
                summary: 'Повернути книгу',
                parameters: [
                    { name: 'id', in: 'path', required: true, schema: { type: 'number' } }
                ],
                responses: {
                    '200': { description: 'Книгу повернено' },
                    '400': { description: 'Книга вже повернута або ID неправильний' },
                    '404': { description: 'Запис про видачу не знайдений' },
                    '500': { description: 'Помилка сервера' }
                }
            }
        },
        '/health': {
            get: {
                summary: 'Перевірка стану сервера',
                responses: {
                    '200': { description: 'Сервер працює' }
                }
            }
        },
        '/auth/register': {
            post: {
                summary: 'Реєстрація користувача',
                requestBody: {
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    name: { type: 'string' },
                                    email: { type: 'string' },
                                    password: { type: 'string' },
                                    role: { type: 'string' }
                                },
                                required: ['name', 'email', 'password']
                            }
                        }
                    }
                },
                responses: {
                    '201': { description: 'Користувач створений' },
                    '400': { description: 'Помилка валідації' },
                    '500': { description: 'Помилка сервера' }
                }
            }
        },
        '/auth/login': {
            post: {
                summary: 'Вхід користувача',
                requestBody: {
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    email: { type: 'string' },
                                    password: { type: 'string' }
                                },
                                required: ['email', 'password']
                            }
                        }
                    }
                },
                responses: {
                    '200': { description: 'Успішний вхід, токен повернуто' },
                    '401': { description: 'Невірний email або пароль' },
                    '500': { description: 'Помилка сервера' }
                }
            }
        }
    }
};

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Підключення маршрутів
const booksRouter = require('./routes/books');
const readersRouter = require('./routes/readers');
const borrowedRouter = require('./routes/borrowed');
const authRouter = require('./routes/auth');

app.use('/books', booksRouter);
app.use('/readers', readersRouter);
app.use('/borrowed', borrowedRouter);
app.use('/auth', authRouter);

// Функція для перевірки підключення до MySQL
async function checkDatabaseConnection() {
    try {
        await mysqlDB.authenticate();
        logger.info('Підключення до MySQL встановлено успішно');
    } catch (error) {
        logger.error('Не вдалося підключитися до MySQL:', error);
        console.error('Помилка підключення до MySQL:', error.message);
        process.exit(1);
    }
}

// Синхронізація бази даних з обробкою помилок
async function syncDatabase() {
    try {
        await mysqlDB.sync({ alter: true });
        logger.info('База даних MySQL синхронізована');
    } catch (error) {
        logger.error('Помилка синхронізації бази даних:', error);
        console.error('Помилка синхронізації бази даних:', error.message);
        process.exit(1);
    }
}

// Ініціалізація підключення та синхронізації
(async () => {
    console.log('Починаємо підключення до бази даних...');
    await checkDatabaseConnection();
    console.log('Починаємо синхронізацію бази даних...');
    await syncDatabase();
    console.log('Запускаємо сервер...');
})();

// Додатковий маршрут для перевірки стану сервера
app.get('/health', (req, res) => {
    res.json({ status: 'UP', timestamp: new Date().toISOString() });
});

// Обробка невизначених маршрутів (404)
app.use((req, res) => {
    logger.warn(`Маршрут не знайдений: ${req.method} ${req.url}`);
    res.status(404).json({ error: 'Маршрут не знайдений' });
});

// Обробка помилок сервера
app.use((err, req, res, next) => {
    logger.error('Непередбачена помилка:', { error: err.stack, url: req.url, method: req.method });
    res.status(500).json({ error: 'Внутрішня помилка сервера' });
});

// Функція для автоматичного вибору порту
function findAvailablePort(startPort = 5000) {
    return new Promise((resolve) => {
        const server = app.listen(startPort, () => {
            const { port } = server.address();
            server.close(() => {
                resolve(port);
            });
        }).on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                findAvailablePort(startPort + 1).then(resolve);
            } else {
                throw err;
            }
        });
    });
}

// Запуск сервера
async function startServer() {
    try {
        const PORT = process.env.PORT || 5000;
        const availablePort = await findAvailablePort(PORT);
        app.listen(availablePort, () => {
            logger.info(`Сервер запущено на порту ${availablePort}`);
            console.log(`Сервер успішно запущено на порту ${availablePort}`);
        });
    } catch (error) {
        logger.error('Не вдалося запустити сервер:', error);
        console.error('Помилка запуску сервера:', error.message);
        process.exit(1);
    }
}

startServer();