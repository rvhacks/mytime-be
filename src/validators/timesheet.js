const Joi = require('joi');

const hoursSchema = Joi.object({
  mon: Joi.number().min(0).max(24).default(0),
  tue: Joi.number().min(0).max(24).default(0),
  wed: Joi.number().min(0).max(24).default(0),
  thu: Joi.number().min(0).max(24).default(0),
  fri: Joi.number().min(0).max(24).default(0),
  sat: Joi.number().min(0).max(24).default(0),
  sun: Joi.number().min(0).max(24).default(0),
});

const timesheetEntrySchema = Joi.object({
  id: Joi.string().uuid().optional(),
  projectId: Joi.string().uuid().required(),
  milestoneId: Joi.string().uuid().optional().allow('', null),
  taskDescription: Joi.string().optional().allow(''),
  billable: Joi.boolean().default(true),
  hours: hoursSchema.required(),
});

const saveTimesheetSchema = Joi.object({
  weekStartDate: Joi.date().required(),
  weekEndDate: Joi.date().required(),
  entries: Joi.array().items(timesheetEntrySchema).min(1).required(),
});

const submitTimesheetSchema = Joi.object({
  timesheetId: Joi.string().uuid().required(),
});

const approvalActionSchema = Joi.object({
  timesheetId: Joi.string().uuid().required(),
  action: Joi.string().valid('approve', 'reject').required(),
  comments: Joi.string().optional().allow(''),
});

module.exports = { saveTimesheetSchema, submitTimesheetSchema, approvalActionSchema };
