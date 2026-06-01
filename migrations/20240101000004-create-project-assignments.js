'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('project_assignments', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      user_id: {
        type: Sequelize.UUID, allowNull: false,
        references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      project_id: {
        type: Sequelize.UUID, allowNull: false,
        references: { model: 'projects', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
      },
      role: { type: Sequelize.STRING(10), allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addIndex('project_assignments', ['user_id', 'project_id'], { unique: true });
    await queryInterface.addIndex('project_assignments', ['project_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('project_assignments');
  },
};
