require('dotenv').config();

const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { connectDB } = require('./src/config/db');

const app = express();

// ---- Security & Logging ----
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginEmbedderPolicy: false,
}));
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  credentials: true,
}));
app.use(morgan('dev'));

// ---- Body Parsing ----
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ---- Static Files ----
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use(['/api/v1/static', '/static', '/uploads'], (req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
}, express.static(uploadsDir));

// ---- Routes ----
app.use(['/api/v1/admin', '/api/v1'], require('./src/router'));

// ---- 404 Handler ----
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` });
});

// ---- Global Error Handler ----
app.use((err, req, res, next) => {
  console.error('[Error]', err.message);
  const status = err.status || err.statusCode || 500;
  return res.status(status).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ---- Start ----
const PORT = process.env.PORT || 5002;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 CSR Dynamic Form mongo-server running on port ${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   API Base:    http://localhost:${PORT}/api/v1`);
  });
});
