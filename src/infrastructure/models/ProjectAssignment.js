const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ProjectAssignment = sequelize.define('ProjectAssignment', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    project_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    role: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
  }, {
    tableName: 'project_assignments',
    indexes: [
      { fields: ['user_id', 'project_id'], unique: true },
      { fields: ['project_id'] },
    ],
  });

  return ProjectAssignment;
};
