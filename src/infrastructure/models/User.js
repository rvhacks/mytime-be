const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    employee_id: {
      type: DataTypes.STRING(20),
      allowNull: true,
      unique: true,
    },
    first_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    last_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    mobile: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    dob: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    role: {
      type: DataTypes.STRING(20), // 'admin' | 'employee' — manager is dynamic
      defaultValue: 'employee',
    },
    designation_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    department: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    avatar_key: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    avatar_path: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    joining_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    reporting_manager_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING(10),
      defaultValue: 'active',
    },
  }, {
    tableName: 'users',
    indexes: [
      { fields: ['email'], unique: true },
      { fields: ['employee_id'], unique: true },
      { fields: ['role'] },
      { fields: ['status'] },
      { fields: ['designation_id'] },
      { fields: ['reporting_manager_id'] },
    ],
  });

  return User;
};
