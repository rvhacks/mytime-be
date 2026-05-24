'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('timesheets', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      user_id: {
        type: Sequelize.UUID, allowNull: false,
        references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      week_start_date: { type: Sequelize.DATEONLY, allowNull: false },
      week_end_date: { type: Sequelize.DATEONLY, allowNull: false },
      status: { type: Sequelize.ENUM('draft', 'submitted', 'approved', 'rejected'), defaultValue: 'draft' },
      total_hours: { type: Sequelize.DECIMAL(6, 2), defaultValue: 0 },
      submitted_at: { type: Sequelize.DATE, allowNull: true },
      reviewed_at: { type: Sequelize.DATE, allowNull: true },
      reviewed_by: {
        type: Sequelize.UUID, allowNull: true,
        references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL',
      },
      comments: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addIndex('timesheets', ['user_id']);
    await queryInterface.addIndex('timesheets', ['user_id', 'week_start_date'], { unique: true });
    await queryInterface.addIndex('timesheets', ['status']);
    await queryInterface.addIndex('timesheets', ['week_start_date']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('timesheets');
  },
};
