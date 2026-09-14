const { Sequelize, DataTypes, Op } = require("sequelize");
require('dotenv').config();

// Database configuration object
const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT, // Default to 5432 if not provided
  dialect: process.env.DB_DIALECT || "postgres", // Default to 'postgres' if not set
  logging: false, // Set to true for logging SQL queries
  timezone: process.env.DB_TIMEZONE || "Asia/Kolkata", // Default timezone
  pool: {
    max: 20,
    min: 0,
    acquire: 60000,
    idle: 10000,
  },
  dialectOptions: {
    application_name: 'techcsr-api',
    connectTimeout: 60000,
  },
};

// Create a Sequelize instance
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  dbConfig
);

// Authenticate the connection and handle errors gracefully
sequelize
  .authenticate()
  .then(async () => {
    console.log("Database connection established successfully");
    try {
      await sequelize.query("CREATE EXTENSION IF NOT EXISTS pgcrypto;");
      console.log("PostgreSQL pgcrypto extension verified.");
    } catch (e) {
      console.warn("Notice: pgcrypto extension setup warning:", e.message);
    }
  })
  .catch((err) => {
    console.error("Unable to connect to the database:", err.message);
    process.exit(1); // Exit the process if DB connection fails
  });

module.exports = { sequelize, DataTypes, Op };
