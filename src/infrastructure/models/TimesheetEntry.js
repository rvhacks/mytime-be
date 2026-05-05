const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TimesheetEntry = sequelize.define('TimesheetEntry', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    timesheet_id: {
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
  }, {
    tableName: 'timesheet_entries',
    indexes: [
      { fields: ['timesheet_id'] },
      { fields: ['project_id'] },
    ],
  });

  return TimesheetEntry;
};
