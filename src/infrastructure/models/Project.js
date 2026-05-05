const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Project = sequelize.define('Project', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    project_code: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    color: {
      type: DataTypes.STRING(10),
      defaultValue: '#6366f1',
    },
    start_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    end_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('active', 'completed', 'on-hold'),
      defaultValue: 'active',
    },
    reporting_managers: {
      type: DataTypes.ARRAY(DataTypes.UUID),
      defaultValue: [],
    },
  }, {
    tableName: 'projects',
    indexes: [
      { fields: ['project_code'], unique: true },
      { fields: ['status'] },
    ],
  });

  return Project;
};
