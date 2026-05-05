const app = require('./app');
const config = require('./config/app');
const logger = require('./utils/logger');
const { sequelize } = require('./infrastructure/models');

const PORT = config.port;

async function startServer() {
  try {
    // Test DB connection
    await sequelize.authenticate();
    logger.info('✅ Database connection established');

    // Start server
    app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT} (${config.nodeEnv})`);
      logger.info(`📚 API Docs: http://localhost:${PORT}/api-docs`);
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle unhandled rejections
process.on('unhandledRejection', (err) => {
  logger.error('UNHANDLED REJECTION:', err);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION:', err);
  process.exit(1);
});

startServer();
