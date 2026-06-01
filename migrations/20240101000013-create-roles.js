'use strict';
const crypto = require('crypto');
const uuidv4 = () => crypto.randomUUID();

/**
 * Create roles master data table and seed default project roles.
 * The label is the role value stored in milestones and project_assignments.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('roles', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      label: { type: Sequelize.STRING(100), allowNull: false, unique: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    // Seed default roles
    await queryInterface.bulkInsert('roles', [
      { id: uuidv4(), label: 'Implementation Consultant', created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), label: 'Technical Consultant',      created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), label: 'Technical Project Manager', created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), label: 'Managed Services',          created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), label: 'Quality Analyst',           created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), label: 'Business Analyst',          created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), label: 'Project Manager',           created_at: new Date(), updated_at: new Date() },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('roles');
  },
};
