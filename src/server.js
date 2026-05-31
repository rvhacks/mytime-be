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

    // NOTE: Schema changes (columns, tables, indexes) are handled by
    // Sequelize migration files in /migrations. Run: npx sequelize-cli db:migrate

    // ── ONE-TIME MIGRATION: Fix legacy Sunday-start timesheets → Monday ──
    // Some timesheets were created with week_start_date on Sunday instead of Monday.
    // Shift them +1 day so all weeks consistently start on Monday and end on Sunday.
    const [sundayTimesheets] = await sequelize.query(
      `SELECT id, user_id, week_start_date, week_end_date FROM timesheets WHERE EXTRACT(DOW FROM week_start_date) = 0`
    );
    if (sundayTimesheets.length > 0) {
      for (const ts of sundayTimesheets) {
        const mondayDate = new Date(ts.week_start_date);
        mondayDate.setDate(mondayDate.getDate() + 1);
        const mondayStr = mondayDate.toISOString().slice(0, 10);

        // Check if there's already a Monday timesheet for this user+week
        const [existing] = await sequelize.query(
          `SELECT id FROM timesheets WHERE user_id = :userId AND week_start_date = :monday AND id != :tsId`,
          { replacements: { userId: ts.user_id, monday: mondayStr, tsId: ts.id } }
        );

        if (existing.length > 0) {
          // Merge: move entries from the Sunday timesheet to the existing Monday one
          const targetId = existing[0].id;
          await sequelize.query(
            `UPDATE timesheet_entries SET timesheet_id = :targetId WHERE timesheet_id = :sourceId`,
            { replacements: { targetId, sourceId: ts.id } }
          );
          // Delete the now-empty Sunday timesheet
          await sequelize.query(`DELETE FROM timesheets WHERE id = :id`, { replacements: { id: ts.id } });
        } else {
          // No conflict — just shift the date
          await sequelize.query(
            `UPDATE timesheets SET week_start_date = week_start_date + INTERVAL '1 day', week_end_date = week_end_date + INTERVAL '1 day' WHERE id = :id`,
            { replacements: { id: ts.id } }
          );
        }
      }
      // Also fix rejection_history table dates
      await sequelize.query(
        `UPDATE rejection_history SET week_start_date = week_start_date + INTERVAL '1 day', week_end_date = week_end_date + INTERVAL '1 day' WHERE EXTRACT(DOW FROM week_start_date) = 0`
      ).catch(() => {});
      logger.info(`✅ Fixed ${sundayTimesheets.length} timesheets from Sunday-start to Monday-start`);
    }

    // Convert existing 4-digit year employee_ids (CT2026-NNNN → CT26-NNNN)
    await sequelize.query(
      `UPDATE users SET employee_id = CONCAT('CT', SUBSTRING(employee_id, 5, 2), SUBSTRING(employee_id, 7)) WHERE employee_id ~ '^CT[0-9]{4}-'`
    ).catch(() => { /* ignore if no rows */ });

    // Backfill employee_id for existing employees without one
    const [empsWithoutId] = await sequelize.query(
      `SELECT id FROM users WHERE (employee_id IS NULL OR employee_id = '') AND role != 'admin' ORDER BY created_at ASC`
    );
    if (empsWithoutId.length > 0) {
      const yy = String(new Date().getFullYear()).slice(-2);
      const prefix = `CT${yy}-`;
      const [lastEmp] = await sequelize.query(
        `SELECT employee_id FROM users WHERE employee_id LIKE '${prefix}%' ORDER BY employee_id DESC LIMIT 1`
      );
      let nextNum = 1;
      if (lastEmp.length > 0 && lastEmp[0].employee_id) {
        const match = lastEmp[0].employee_id.match(/CT\d{2}-(\d+)/);
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
