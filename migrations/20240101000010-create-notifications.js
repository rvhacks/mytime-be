'use strict';

/**
 * Create notifications table (safe: skips if already exists).
 * This table may already exist if the sync migration (0009) ran or Sequelize sync created it.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // createTable is idempotent in the sync migration, but standalone it throws if table exists
    try {
      await queryInterface.createTable('notifications', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
        user_id: {
          type: Sequelize.UUID, allowNull: false,
          references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
        },
        title: { type: Sequelize.STRING(255), allowNull: false },
        message: { type: Sequelize.TEXT, allowNull: false },
        type: { type: Sequelize.STRING(20), defaultValue: 'info' },
        category: { type: Sequelize.STRING(30), defaultValue: 'general' },
        read: { type: Sequelize.BOOLEAN, defaultValue: false },
        metadata: { type: Sequelize.JSONB, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      });
    } catch (e) { /* table already exists */ }

    try { await queryInterface.addIndex('notifications', ['user_id'], { name: 'notifications_user_id_idx' }); } catch (e) { /* exists */ }
    try { await queryInterface.addIndex('notifications', ['user_id', 'read'], { name: 'notifications_user_read_idx' }); } catch (e) { /* exists */ }
    try { await queryInterface.addIndex('notifications', ['created_at'], { name: 'notifications_created_at_idx' }); } catch (e) { /* exists */ }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('notifications');
  },
};
