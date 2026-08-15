require('dotenv').config({ path: '../../../.env', override: true });

module.exports = {
  development: {
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_DATABASE || 'airbnb_development',
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || '3306'),
    dialect: 'mysql',
    seederStorage: 'sequelize',
    dialectOptions: { charset: 'utf8mb4' },
  },
};
