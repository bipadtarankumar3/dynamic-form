require("dotenv").config();
const app = require("./src/app");
const http = require("http");
const bootstrap = require("./scripts/bootstrapCompany");
const { seedCoreForms } = require("./scripts/seedCoreForms");

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const server = http.createServer(app);
const PORT = process.env.APPLICATION_PORT || 6003;

// Auto-bootstrap DB before starting server listener
bootstrap()
  .then(async () => {
    try {
      await seedCoreForms();
    } catch (e) {
      console.warn("[Startup] Seed core forms warning:", e.message);
    }
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(async (err) => {
    console.error("Notice: Auto-bootstrap encountered an error on startup:", err.message);
    try {
      await seedCoreForms();
    } catch (e) {
      console.warn("[Startup] Seed core forms warning:", e.message);
    }
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
    });
  });

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection:", reason);
  server.close(() => process.exit(1));
});

