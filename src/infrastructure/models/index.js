const { Sequelize } = require('sequelize');
const dbConfig = require('../../config/database');
const logger = require('../../utils/logger');

const env = process.env.NODE_ENV || 'development';
const config = dbConfig[env];

const sequelize = new Sequelize(config.database, config.username, config.password, {
  host: config.host,
  port: config.port,
  dialect: config.dialect,
  logging: config.logging !== false ? (msg) => logger.debug(msg) : false,
  pool: config.pool || { max: 10, min: 2, acquire: 30000, idle: 10000 },
  define: config.define || { timestamps: true, underscored: true },
});

// ---- MODELS ----
const User = require('./User')(sequelize);
const Designation = require('./Designation')(sequelize);
const Project = require('./Project')(sequelize);
const ProjectAssignment = require('./ProjectAssignment')(sequelize);
const Milestone = require('./Milestone')(sequelize);
const Timesheet = require('./Timesheet')(sequelize);
const TimesheetEntry = require('./TimesheetEntry')(sequelize);
const Otp = require('./Otp')(sequelize);
const Notification = require('./Notification')(sequelize);

// ---- ASSOCIATIONS ----

// User <-> Designation
Designation.hasMany(User, { foreignKey: 'designation_id', as: 'users' });
User.belongsTo(Designation, { foreignKey: 'designation_id', as: 'designation' });

// User <-> Reporting Manager (self-referencing)
User.belongsTo(User, { foreignKey: 'reporting_manager_id', as: 'reportingManager' });
User.hasMany(User, { foreignKey: 'reporting_manager_id', as: 'directReports' });

// Milestones — role-based templates (no project FK)
// Kept standalone; filtered by role in queries

// Project assignments
Project.hasMany(ProjectAssignment, { foreignKey: 'project_id', as: 'assignments' });
ProjectAssignment.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });

User.hasMany(ProjectAssignment, { foreignKey: 'user_id', as: 'assignments' });
ProjectAssignment.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Timesheets (week container — no status, just a grouping envelope)
User.hasMany(Timesheet, { foreignKey: 'user_id', as: 'timesheets' });
Timesheet.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Timesheet entries (each entry has its own lifecycle)
Timesheet.hasMany(TimesheetEntry, { foreignKey: 'timesheet_id', as: 'entries' });
TimesheetEntry.belongsTo(Timesheet, { foreignKey: 'timesheet_id', as: 'timesheet' });

Project.hasMany(TimesheetEntry, { foreignKey: 'project_id', as: 'timesheetEntries' });
TimesheetEntry.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });

Milestone.hasMany(TimesheetEntry, { foreignKey: 'milestone_id', as: 'timesheetEntries' });
TimesheetEntry.belongsTo(Milestone, { foreignKey: 'milestone_id', as: 'milestone' });

// Entry reviewer
User.hasMany(TimesheetEntry, { foreignKey: 'reviewed_by', as: 'reviewedEntries' });
TimesheetEntry.belongsTo(User, { foreignKey: 'reviewed_by', as: 'reviewer' });

// OTP
User.hasMany(Otp, { foreignKey: 'user_id', as: 'otps' });
Otp.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Notifications
User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

module.exports = {
  sequelize,
  Sequelize,
  User,
  Designation,
  Project,
  ProjectAssignment,
  Milestone,
  Timesheet,
  TimesheetEntry,
  Otp,
  Notification,
};
