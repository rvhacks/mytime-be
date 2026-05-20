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

    // Backfill employee_id for existing employees without one
    const [empsWithoutId] = await sequelize.query(
      `SELECT id FROM users WHERE (employee_id IS NULL OR employee_id = '') AND role != 'admin' ORDER BY created_at ASC`
    );
    if (empsWithoutId.length > 0) {
      const year = new Date().getFullYear();
      const prefix = `CT${year}-`;
      const [lastEmp] = await sequelize.query(
        `SELECT employee_id FROM users WHERE employee_id LIKE '${prefix}%' ORDER BY employee_id DESC LIMIT 1`
      );
      let nextNum = 1;
      if (lastEmp.length > 0 && lastEmp[0].employee_id) {
        const match = lastEmp[0].employee_id.match(/CT\d{4}-(\d+)/);
        if (match) nextNum = parseInt(match[1], 10) + 1;
      }
      for (const emp of empsWithoutId) {
        const eid = `${prefix}${String(nextNum).padStart(4, '0')}`;
        await sequelize.query(`UPDATE users SET employee_id = '${eid}' WHERE id = '${emp.id}'`);
        nextNum++;
      }
      logger.info(`✅ Backfilled employee_id for ${empsWithoutId.length} employees`);
    }

    // Backfill project_id for existing projects without one
    const [projsWithoutId] = await sequelize.query(
      `SELECT id FROM projects WHERE (project_id IS NULL OR project_id = '') ORDER BY created_at ASC`
    );
    if (projsWithoutId.length > 0) {
      const yy = String(new Date().getFullYear()).slice(-2);
      const projPrefix = `CT-${yy}`;
      const [lastProj] = await sequelize.query(
        `SELECT project_id FROM projects WHERE project_id LIKE '${projPrefix}%' ORDER BY project_id DESC LIMIT 1`
      );
      let nextProjNum = 1;
      if (lastProj.length > 0 && lastProj[0].project_id) {
        const match = lastProj[0].project_id.match(/CT-\d{2}(\d+)/);
        if (match) nextProjNum = parseInt(match[1], 10) + 1;
      }
      for (const proj of projsWithoutId) {
        const pid = `${projPrefix}${String(nextProjNum).padStart(4, '0')}`;
        await sequelize.query(`UPDATE projects SET project_id = '${pid}' WHERE id = '${proj.id}'`);
        nextProjNum++;
      }
      logger.info(`✅ Backfilled project_id for ${projsWithoutId.length} projects`);
    }

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
