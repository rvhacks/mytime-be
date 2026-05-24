const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Designation = sequelize.define('Designation', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false,
      unique: true,
    },
  }, {
    tableName: 'designations',
  });

  return Designation;
};
