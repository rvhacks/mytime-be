'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('users', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      employee_id: { type: Sequelize.STRING(20), allowNull: true, unique: true },
      first_name: { type: Sequelize.STRING(100), allowNull: false },
      last_name: { type: Sequelize.STRING(100), allowNull: false },
      email: { type: Sequelize.STRING(255), allowNull: false, unique: true },
      password: { type: Sequelize.STRING(255), allowNull: false },
      mobile: { type: Sequelize.STRING(20), allowNull: true },
      dob: { type: Sequelize.DATEONLY, allowNull: true },
      role: { type: Sequelize.STRING(20), defaultValue: 'employee' },
      designation_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'designations', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      department: { type: Sequelize.STRING(100), allowNull: true },
      avatar_key: { type: Sequelize.STRING(500), allowNull: true },
      avatar_path: { type: Sequelize.STRING(500), allowNull: true },
      joining_date: { type: Sequelize.DATEONLY, allowNull: true },
      reporting_manager_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      must_change_password: { type: Sequelize.BOOLEAN, defaultValue: false },
      status: { type: Sequelize.STRING(10), defaultValue: 'active' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.addIndex('users', ['email'], { unique: true });
    await queryInterface.addIndex('users', ['employee_id'], { unique: true });
    await queryInterface.addIndex('users', ['role']);
    await queryInterface.addIndex('users', ['status']);
    await queryInterface.addIndex('users', ['designation_id']);
    await queryInterface.addIndex('users', ['reporting_manager_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('users');
  },
};
