const dotenv = require('dotenv');

dotenv.config();

const config = {
  development: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: 'airbnb_development',
    host: process.env.DB_HOST,
    dialect: 'mysql',
  },
};

module.exports = config;