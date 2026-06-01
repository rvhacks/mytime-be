'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('milestones', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      name: { type: Sequelize.STRING(255), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      role: { type: Sequelize.STRING(10), allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addIndex('milestones', ['role']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('milestones');
  },
};
