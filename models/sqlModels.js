// sqlModels.js
const { DataTypes } = require('sequelize');
const mysqlDB = require('../mysql');

const User = mysqlDB.define('User', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.STRING, allowNull: false, defaultValue: 'user' } // 'user' або 'admin'
});

const Book = mysqlDB.define('Book', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    title: { type: DataTypes.STRING, allowNull: false },
    author: { type: DataTypes.STRING, allowNull: false },
    year: { type: DataTypes.INTEGER, allowNull: false },
    genre: { type: DataTypes.STRING, allowNull: false }
});

const Reader = mysqlDB.define('Reader', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    phone: { type: DataTypes.STRING, allowNull: false }
});

const BorrowedBook = mysqlDB.define('BorrowedBook', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    book_id: { type: DataTypes.INTEGER, allowNull: false },
    reader_id: { type: DataTypes.INTEGER, allowNull: false },
    borrow_date: { type: DataTypes.DATE, allowNull: false },
    return_date: { type: DataTypes.DATE, allowNull: true }
});

module.exports = { User, Book, Reader, BorrowedBook };