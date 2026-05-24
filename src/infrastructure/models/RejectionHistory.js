const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const RejectionHistory = sequelize.define('RejectionHistory', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    entry_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    timesheet_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    employee_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    project_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    milestone_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    task_description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    billable: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    hours_mon: { type: DataTypes.DECIMAL(4, 2), defaultValue: 0 },
    hours_tue: { type: DataTypes.DECIMAL(4, 2), defaultValue: 0 },
    hours_wed: { type: DataTypes.DECIMAL(4, 2), defaultValue: 0 },
    hours_thu: { type: DataTypes.DECIMAL(4, 2), defaultValue: 0 },
    hours_fri: { type: DataTypes.DECIMAL(4, 2), defaultValue: 0 },
    hours_sat: { type: DataTypes.DECIMAL(4, 2), defaultValue: 0 },
    hours_sun: { type: DataTypes.DECIMAL(4, 2), defaultValue: 0 },
    total_hours: {
      type: DataTypes.DECIMAL(6, 2),
      defaultValue: 0,
    },
    rejected_by: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    rejected_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    rejection_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    week_start_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    week_end_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
  }, {
    tableName: 'rejection_history',
    indexes: [
      { fields: ['entry_id'] },
      { fields: ['employee_id'] },
      { fields: ['project_id'] },
      { fields: ['rejected_at'] },
    ],
  });

  return RejectionHistory;
};
