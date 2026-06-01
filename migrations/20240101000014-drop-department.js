'use strict';

/**
 * Drop unused department column from users table.
 * Not used in any UI or business logic.
 */
module.exports = {
  async up(queryInterface) {
    try {
      await queryInterface.removeColumn('users', 'department');
    } catch (e) { /* column doesn't exist */ }
  },

  async down(queryInterface, Sequelize) {
    try {
      await queryInterface.addColumn('users', 'department', {
        type: Sequelize.STRING(100),
        allowNull: true,
      });
    } catch (e) { /* column already exists */ }
  },
};
