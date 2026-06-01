'use strict';

/**
 * Drop unused avatar_key column from users table.
 * This column was a leftover from planned S3 uploads — never used anywhere.
 * Avatar storage uses avatar_path (local file) instead.
 */
module.exports = {
  async up(queryInterface) {
    try {
      await queryInterface.removeColumn('users', 'avatar_key');
    } catch (e) { /* column doesn't exist */ }
  },

  async down(queryInterface, Sequelize) {
    try {
      await queryInterface.addColumn('users', 'avatar_key', {
        type: Sequelize.STRING(500),
        allowNull: true,
      });
    } catch (e) { /* column already exists */ }
  },
};
