'use strict';

/**
 * Drop the key column from roles table — label is used directly as the role value.
 * Also make label unique since it now serves as the identifier.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      await queryInterface.removeColumn('roles', 'key');
    } catch (e) { /* column doesn't exist */ }

    // Make label unique
    try {
      await queryInterface.changeColumn('roles', 'label', {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true,
      });
    } catch (e) { /* already unique */ }
  },

  async down(queryInterface, Sequelize) {
    try {
      await queryInterface.addColumn('roles', 'key', {
        type: Sequelize.STRING(20),
        allowNull: true,
        unique: true,
      });
    } catch (e) { /* column already exists */ }
  },
};
