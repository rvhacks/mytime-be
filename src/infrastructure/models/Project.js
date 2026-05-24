const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Project = sequelize.define('Project', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    project_id: {
      type: DataTypes.STRING(20),
      allowNull: true,
      unique: true,
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
      type: DataTypes.STRING(20),
      defaultValue: '#6366f1',
    },
    partner_project_id: {
      type: DataTypes.STRING(50),
      allowNull: true,
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
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  }, {
    tableName: 'projects',
    paranoid: true,          // enables soft-delete via deleted_at
    deletedAt: 'deleted_at',
    indexes: [
      { fields: ['project_code'], unique: true },
      { fields: ['project_id'], unique: true },
      { fields: ['status'] },
    ],
  });

  return Project;
};
