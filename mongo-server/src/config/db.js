// mongo-server/src/config/db.js
const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const connStr = process.env.MONGODB_URI || "mongodb://localhost:27017/dynamicform_db";
    const conn = await mongoose.connect(connStr, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`[MongoDB] Connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error) {
    console.error(`[MongoDB Error] Connection failed: ${error.message}`);
  }
};

mongoose.connection.on("disconnected", () => {
  console.warn("[MongoDB Warning] Lost database connection.");
});

module.exports = connectDB;
