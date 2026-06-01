'use strict';
const crypto = require('crypto');
const uuidv4 = () => crypto.randomUUID();

/**
 * Create roles master data table and seed default project roles.
 * Roles are referenced by key (e.g. 'IC') in milestones and project_assignments,
 * but stored as a string value — NOT as a FK.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('roles', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      key: { type: Sequelize.STRING(20), allowNull: false, unique: true },
      label: { type: Sequelize.STRING(100), allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    // Seed default roles
    await queryInterface.bulkInsert('roles', [
      { id: uuidv4(), key: 'IC',  label: 'Implementation Consultant', created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), key: 'TC',  label: 'Technical Consultant',      created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), key: 'TPM', label: 'Technical Project Manager', created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), key: 'MS',  label: 'Managed Services',          created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), key: 'QA',  label: 'Quality Analyst',           created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), key: 'BA',  label: 'Business Analyst',          created_at: new Date(), updated_at: new Date() },
      { id: uuidv4(), key: 'PM',  label: 'Project Manager',           created_at: new Date(), updated_at: new Date() },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('roles');
  },
};
