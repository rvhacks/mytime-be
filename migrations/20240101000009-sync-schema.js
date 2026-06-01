'use strict';

/**
 * Comprehensive migration to sync the database schema with the Sequelize models.
 *
 * This migration adds all columns and tables that were added to the models
 * after the initial migration files were created, including columns that were
 * previously handled by `safeAddColumn()` calls in server.js.
 *
 * Safe to run on existing databases — uses IF NOT EXISTS and try/catch.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // ======================================================================
    // HELPER: Add column only if it doesn't already exist
    // ======================================================================
    const safeAddColumn = async (table, column, definition) => {
      try {
        await queryInterface.addColumn(table, column, definition);
      } catch (e) {
        // Column already exists — ignore
      }
    };

    // ======================================================================
    // 1. USERS TABLE — missing columns
    // ======================================================================
    await safeAddColumn('users', 'employee_id', {
      type: Sequelize.STRING(20),
      allowNull: true,
      unique: true,
    });

    await safeAddColumn('users', 'reporting_manager_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    await safeAddColumn('users', 'avatar_path', {
      type: Sequelize.STRING(500),
      allowNull: true,
    });

    await safeAddColumn('users', 'must_change_password', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    });

    // Fix role column: migration created ENUM('admin','manager','employee')
    // but model uses STRING(20) — ALTER to VARCHAR to support dynamic role checking
    try {
      // Drop default, change type, re-add default
      await queryInterface.sequelize.query(
        `ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT`
      );
      await queryInterface.sequelize.query(
        `ALTER TABLE "users" ALTER COLUMN "role" TYPE VARCHAR(20) USING role::VARCHAR(20)`
      );
      await queryInterface.sequelize.query(
        `ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'employee'`
      );
      // Drop the old enum type if it exists
      await queryInterface.sequelize.query(
        `DROP TYPE IF EXISTS "enum_users_role"`
      );
    } catch (e) {
      // Already VARCHAR — ignore
    }

    // Fix status column: migration created ENUM('active','inactive')
    // but model uses STRING(10)
    try {
      await queryInterface.sequelize.query(
        `ALTER TABLE "users" ALTER COLUMN "status" DROP DEFAULT`
      );
      await queryInterface.sequelize.query(
        `ALTER TABLE "users" ALTER COLUMN "status" TYPE VARCHAR(10) USING status::VARCHAR(10)`
      );
      await queryInterface.sequelize.query(
        `ALTER TABLE "users" ALTER COLUMN "status" SET DEFAULT 'active'`
      );
      await queryInterface.sequelize.query(
        `DROP TYPE IF EXISTS "enum_users_status"`
      );
    } catch (e) {
      // Already VARCHAR — ignore
    }

    // Add missing indexes
    try {
      await queryInterface.addIndex('users', ['employee_id'], { unique: true, name: 'users_employee_id_unique' });
    } catch (e) { /* already exists */ }
    try {
      await queryInterface.addIndex('users', ['reporting_manager_id'], { name: 'users_reporting_manager_id' });
    } catch (e) { /* already exists */ }

    // ======================================================================
    // 2. PROJECTS TABLE — missing columns & fixes
    // ======================================================================
    await safeAddColumn('projects', 'project_id', {
      type: Sequelize.STRING(20),
      allowNull: true,
      unique: true,
    });

    await safeAddColumn('projects', 'partner_project_id', {
      type: Sequelize.STRING(50),
      allowNull: true,
    });

    // Widen color column from VARCHAR(10) to VARCHAR(20)
    try {
      await queryInterface.sequelize.query(
        `ALTER TABLE "projects" ALTER COLUMN "color" TYPE VARCHAR(20)`
      );
    } catch (e) { /* already correct */ }

    // Note: Project model still uses ENUM('active','completed','on-hold') for status
    // so we do NOT convert it to VARCHAR — just keep it as-is.

    // Add deleted_at for soft-delete (paranoid model)
    await safeAddColumn('projects', 'deleted_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    // Add project_id unique index
    try {
      await queryInterface.addIndex('projects', ['project_id'], { unique: true, name: 'projects_project_id_unique' });
    } catch (e) { /* already exists */ }

    // ======================================================================
    // 3. PROJECT_ASSIGNMENTS TABLE — fixes
    // ======================================================================
    // Fix role column: ENUM → STRING(10)
    try {
      await queryInterface.sequelize.query(
        `ALTER TABLE "project_assignments" ALTER COLUMN "role" TYPE VARCHAR(10) USING role::VARCHAR(10)`
      );
      await queryInterface.sequelize.query(
        `DROP TYPE IF EXISTS "enum_project_assignments_role"`
      );
    } catch (e) { /* already VARCHAR */ }

    // Drop orphaned rm_id column (model doesn't have it; RM is tracked via users.reporting_manager_id)
    try {
      await queryInterface.removeColumn('project_assignments', 'rm_id');
    } catch (e) { /* column doesn't exist */ }

    // ======================================================================
    // 4. MILESTONES TABLE — fixes
    // ======================================================================
    // Fix role column: ENUM → STRING(10)
    try {
      await queryInterface.sequelize.query(
        `ALTER TABLE "milestones" ALTER COLUMN "role" TYPE VARCHAR(10) USING role::VARCHAR(10)`
      );
      await queryInterface.sequelize.query(
        `DROP TYPE IF EXISTS "enum_milestones_role"`
      );
    } catch (e) { /* already VARCHAR */ }

    // Drop orphaned project_id column (model treats milestones as role-based templates, no project FK)
    // Must drop FK constraint and index first
    try {
      await queryInterface.removeColumn('milestones', 'project_id');
    } catch (e) { /* column doesn't exist */ }

    // Drop orphaned status column (model doesn't define status for milestones)
    try {
      await queryInterface.removeColumn('milestones', 'status');
      await queryInterface.sequelize.query(
        `DROP TYPE IF EXISTS "enum_milestones_status"`
      );
    } catch (e) { /* column doesn't exist */ }

    // ======================================================================
    // 5. TIMESHEET_ENTRIES TABLE — missing per-entry workflow columns
    // ======================================================================
    await safeAddColumn('timesheet_entries', 'status', {
      type: Sequelize.STRING(20),
      defaultValue: 'draft',
    });

    await safeAddColumn('timesheet_entries', 'submitted_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await safeAddColumn('timesheet_entries', 'reviewed_by', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    await safeAddColumn('timesheet_entries', 'reviewed_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await safeAddColumn('timesheet_entries', 'review_comments', {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    await safeAddColumn('timesheet_entries', 'resubmission_count', {
      type: Sequelize.INTEGER,
      defaultValue: 0,
    });

    await safeAddColumn('timesheet_entries', 'rejection_history', {
      type: Sequelize.JSONB,
      allowNull: true,
    });

    // Add missing status index
    try {
      await queryInterface.addIndex('timesheet_entries', ['status'], { name: 'timesheet_entries_status' });
    } catch (e) { /* already exists */ }

    // ======================================================================
    // 6. NOTIFICATIONS TABLE — entirely missing from migrations
    // ======================================================================
    await queryInterface.createTable('notifications', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      user_id: {
        type: Sequelize.UUID, allowNull: false,
        references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      title: { type: Sequelize.STRING(255), allowNull: false },
      message: { type: Sequelize.TEXT, allowNull: false },
      type: { type: Sequelize.STRING(20), defaultValue: 'info' },
      category: { type: Sequelize.STRING(30), defaultValue: 'general' },
      read: { type: Sequelize.BOOLEAN, defaultValue: false },
      metadata: { type: Sequelize.JSONB, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    }).catch(() => { /* table already exists */ });

    try {
      await queryInterface.addIndex('notifications', ['user_id'], { name: 'notifications_user_id' });
    } catch (e) { /* already exists */ }
    try {
      await queryInterface.addIndex('notifications', ['user_id', 'read'], { name: 'notifications_user_id_read' });
    } catch (e) { /* already exists */ }
    try {
      await queryInterface.addIndex('notifications', ['created_at'], { name: 'notifications_created_at' });
    } catch (e) { /* already exists */ }

    // ======================================================================
    // 7. REJECTION_HISTORY TABLE — entirely missing from migrations
    // ======================================================================
    await queryInterface.createTable('rejection_history', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.literal('gen_random_uuid()'), primaryKey: true },
      entry_id: {
        type: Sequelize.UUID, allowNull: false,
        references: { model: 'timesheet_entries', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      timesheet_id: {
        type: Sequelize.UUID, allowNull: false,
        references: { model: 'timesheets', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      employee_id: {
        type: Sequelize.UUID, allowNull: false,
        references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      project_id: {
        type: Sequelize.UUID, allowNull: false,
        references: { model: 'projects', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      milestone_id: {
        type: Sequelize.UUID, allowNull: true,
        references: { model: 'milestones', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL',
      },
      task_description: { type: Sequelize.TEXT, allowNull: true },
      billable: { type: Sequelize.BOOLEAN, defaultValue: true },
      hours_mon: { type: Sequelize.DECIMAL(4, 2), defaultValue: 0 },
      hours_tue: { type: Sequelize.DECIMAL(4, 2), defaultValue: 0 },
      hours_wed: { type: Sequelize.DECIMAL(4, 2), defaultValue: 0 },
      hours_thu: { type: Sequelize.DECIMAL(4, 2), defaultValue: 0 },
      hours_fri: { type: Sequelize.DECIMAL(4, 2), defaultValue: 0 },
      hours_sat: { type: Sequelize.DECIMAL(4, 2), defaultValue: 0 },
      hours_sun: { type: Sequelize.DECIMAL(4, 2), defaultValue: 0 },
      total_hours: { type: Sequelize.DECIMAL(6, 2), defaultValue: 0 },
      rejected_by: {
        type: Sequelize.UUID, allowNull: false,
        references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      rejected_at: { type: Sequelize.DATE, allowNull: false },
      rejection_reason: { type: Sequelize.TEXT, allowNull: true },
      week_start_date: { type: Sequelize.DATEONLY, allowNull: false },
      week_end_date: { type: Sequelize.DATEONLY, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    }).catch(() => { /* table already exists */ });

    try {
      await queryInterface.addIndex('rejection_history', ['entry_id'], { name: 'idx_rejection_history_entry_id' });
    } catch (e) { /* already exists */ }
    try {
      await queryInterface.addIndex('rejection_history', ['employee_id'], { name: 'idx_rejection_history_employee_id' });
    } catch (e) { /* already exists */ }
    try {
      await queryInterface.addIndex('rejection_history', ['project_id'], { name: 'idx_rejection_history_project_id' });
    } catch (e) { /* already exists */ }
    try {
      await queryInterface.addIndex('rejection_history', ['rejected_at'], { name: 'idx_rejection_history_rejected_at' });
    } catch (e) { /* already exists */ }

    // ======================================================================
    // 8. FIX TIMESHEETS TABLE — ENUM → STRING for status
    // ======================================================================
    // Timesheet model uses ENUM for status. We need to ensure 'resubmitted' is a valid value
    // (original migration only had: draft, submitted, approved, rejected)
    try {
      await queryInterface.sequelize.query(
        `ALTER TYPE "enum_timesheets_status" ADD VALUE IF NOT EXISTS 'resubmitted'`
      );
    } catch (e) { /* already has the value or type doesn't exist */ }
  },

  async down(queryInterface) {
    // Reverse in order (only for new tables/columns added by this migration)
    await queryInterface.dropTable('rejection_history').catch(() => {});
    await queryInterface.dropTable('notifications').catch(() => {});

    const safeRemoveColumn = async (table, column) => {
      try { await queryInterface.removeColumn(table, column); } catch (e) { /* ignore */ }
    };

    // timesheet_entries
    await safeRemoveColumn('timesheet_entries', 'rejection_history');
    await safeRemoveColumn('timesheet_entries', 'resubmission_count');
    await safeRemoveColumn('timesheet_entries', 'review_comments');
    await safeRemoveColumn('timesheet_entries', 'reviewed_at');
    await safeRemoveColumn('timesheet_entries', 'reviewed_by');
    await safeRemoveColumn('timesheet_entries', 'submitted_at');
    await safeRemoveColumn('timesheet_entries', 'status');

    // users
    await safeRemoveColumn('users', 'must_change_password');
    await safeRemoveColumn('users', 'avatar_path');
    await safeRemoveColumn('users', 'reporting_manager_id');
    await safeRemoveColumn('users', 'employee_id');

    // projects
    await safeRemoveColumn('projects', 'partner_project_id');
    await safeRemoveColumn('projects', 'project_id');
  },
};
