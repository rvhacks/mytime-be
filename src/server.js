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

    // Add missing columns (safe: IF NOT EXISTS / catches "already exists")
    const safeAddColumn = async (table, column, type, extra = '') => {
      try {
        await sequelize.query(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "${column}" ${type} ${extra}`);
      } catch (e) {
        // Column already exists — ignore
      }
    };

    await safeAddColumn('users', 'employee_id', 'VARCHAR(20)', 'UNIQUE');
    await safeAddColumn('projects', 'project_id', 'VARCHAR(20)', 'UNIQUE');
    await safeAddColumn('projects', 'partner_project_id', 'VARCHAR(50)');
    await safeAddColumn('timesheet_entries', 'resubmission_count', 'INTEGER', 'DEFAULT 0');
    await safeAddColumn('timesheet_entries', 'rejection_history', 'JSONB', "DEFAULT '[]'::jsonb");

    // Widen color column if it's still VARCHAR(7)
    try {
      await sequelize.query(`ALTER TABLE "projects" ALTER COLUMN "color" TYPE VARCHAR(20)`);
    } catch { /* already correct type */ }

    logger.info('✅ Database schema updated');

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
