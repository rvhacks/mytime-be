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
    rm_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM('IC', 'MS', 'TPM', 'PM', 'QA', 'BA'),
      allowNull: false,
    },
  }, {
    tableName: 'project_assignments',
    indexes: [
      { fields: ['user_id', 'project_id'], unique: true },
      { fields: ['project_id'] },
      { fields: ['rm_id'] },
    ],
  });

  return ProjectAssignment;
};
