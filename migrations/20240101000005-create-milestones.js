'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('milestones', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      project_id: {
        type: Sequelize.UUID, allowNull: false,
        references: { model: 'projects', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      name: { type: Sequelize.STRING(255), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      role: { type: Sequelize.ENUM('IC', 'MS', 'TPM', 'PM', 'QA', 'BA'), allowNull: true },
      status: { type: Sequelize.ENUM('pending', 'in-progress', 'completed'), defaultValue: 'pending' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addIndex('milestones', ['project_id']);
    await queryInterface.addIndex('milestones', ['status']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('milestones');
  },
};
