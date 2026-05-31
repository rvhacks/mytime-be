'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('projects', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      project_id: { type: Sequelize.STRING(20), allowNull: true, unique: true },
      project_code: { type: Sequelize.STRING(20), allowNull: false, unique: true },
      name: { type: Sequelize.STRING(255), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      color: { type: Sequelize.STRING(20), defaultValue: '#6366f1' },
      partner_project_id: { type: Sequelize.STRING(50), allowNull: true },
      start_date: { type: Sequelize.DATEONLY, allowNull: true },
      end_date: { type: Sequelize.DATEONLY, allowNull: true },
      status: { type: Sequelize.ENUM('active', 'completed', 'on-hold'), defaultValue: 'active' },
      deleted_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addIndex('projects', ['project_code'], { unique: true });
    await queryInterface.addIndex('projects', ['project_id'], { unique: true });
    await queryInterface.addIndex('projects', ['status']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('projects');
  },
};
