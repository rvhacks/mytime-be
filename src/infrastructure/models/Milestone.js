const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Milestone = sequelize.define('Milestone', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    role: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
  }, {
    tableName: 'milestones',
    indexes: [
      { fields: ['role'] },
    ],
  });

  return Milestone;
};
