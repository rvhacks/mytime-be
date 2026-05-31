'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('timesheet_entries', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      timesheet_id: {
        type: Sequelize.UUID, allowNull: false,
        references: { model: 'timesheets', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
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
      // Per-entry workflow state
      status: { type: Sequelize.STRING(20), defaultValue: 'draft' },
      submitted_at: { type: Sequelize.DATE, allowNull: true },
      reviewed_by: {
        type: Sequelize.UUID, allowNull: true,
        references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL',
      },
      reviewed_at: { type: Sequelize.DATE, allowNull: true },
      review_comments: { type: Sequelize.TEXT, allowNull: true },
      resubmission_count: { type: Sequelize.INTEGER, defaultValue: 0 },
      rejection_history: { type: Sequelize.JSONB, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addIndex('timesheet_entries', ['timesheet_id']);
    await queryInterface.addIndex('timesheet_entries', ['project_id']);
    await queryInterface.addIndex('timesheet_entries', ['status']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('timesheet_entries');
  },
};
