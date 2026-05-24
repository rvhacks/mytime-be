const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Timesheet = sequelize.define('Timesheet', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    week_start_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    week_end_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('draft', 'submitted', 'approved', 'rejected'),
      defaultValue: 'draft',
    },
    total_hours: {
      type: DataTypes.DECIMAL(6, 2),
      defaultValue: 0,
    },
    submitted_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    reviewed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    reviewed_by: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    comments: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    tableName: 'timesheets',
    indexes: [
      { fields: ['user_id'] },
      { fields: ['user_id', 'week_start_date'], unique: true },
      { fields: ['status'] },
      { fields: ['week_start_date'] },
    ],
  });

  return Timesheet;
};
