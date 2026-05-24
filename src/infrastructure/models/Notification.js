const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Notification = sequelize.define('Notification', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM('info', 'success', 'warning', 'error'),
      defaultValue: 'info',
    },
    category: {
      type: DataTypes.ENUM('general', 'employee', 'password', 'assignment', 'timesheet', 'project', 'milestone'),
      defaultValue: 'general',
    },
    read: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
  }, {
    tableName: 'notifications',
    indexes: [
      { fields: ['user_id'] },
      { fields: ['user_id', 'read'] },
      { fields: ['created_at'] },
    ],
  });

  return Notification;
};
