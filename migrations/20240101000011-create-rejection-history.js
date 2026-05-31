'use strict';

/**
 * Create rejection_history table (safe: skips if already exists).
 * This table may already exist if the sync migration (0009) ran or server.js created it.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      await queryInterface.createTable('rejection_history', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
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
      });
    } catch (e) { /* table already exists */ }

    try { await queryInterface.addIndex('rejection_history', ['entry_id'], { name: 'rejection_history_entry_id_idx' }); } catch (e) { /* exists */ }
    try { await queryInterface.addIndex('rejection_history', ['employee_id'], { name: 'rejection_history_employee_id_idx' }); } catch (e) { /* exists */ }
    try { await queryInterface.addIndex('rejection_history', ['project_id'], { name: 'rejection_history_project_id_idx' }); } catch (e) { /* exists */ }
    try { await queryInterface.addIndex('rejection_history', ['rejected_at'], { name: 'rejection_history_rejected_at_idx' }); } catch (e) { /* exists */ }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('rejection_history');
  },
};
