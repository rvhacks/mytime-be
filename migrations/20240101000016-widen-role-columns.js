'use strict';

/**
 * Widen the role column in milestones and project_assignments
 * from VARCHAR(10) to VARCHAR(100) to accommodate full role labels
 * like "Implementation Consultant" (27 chars).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      await queryInterface.changeColumn('milestones', 'role', {
        type: Sequelize.STRING(100),
        allowNull: false,
      });
    } catch (e) { /* already widened */ }

    try {
      await queryInterface.changeColumn('project_assignments', 'role', {
        type: Sequelize.STRING(100),
        allowNull: false,
      });
    } catch (e) { /* already widened */ }
  },

  async down(queryInterface, Sequelize) {
    // Not reverting — data could be lost by truncation
  },
};
