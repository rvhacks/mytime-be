const Joi = require('joi');

const createDesignationSchema = Joi.object({
  name: Joi.string().min(2).max(200).required(),
});

const createEmployeeSchema = Joi.object({
  firstName: Joi.string().min(1).max(100).required(),
  lastName: Joi.string().min(1).max(100).required(),
  email: Joi.string().email().required(),
  mobile: Joi.string().min(10).max(15).required(),
  dob: Joi.date().required(),
  designationId: Joi.string().uuid().required(),
  joiningDate: Joi.date().required(),
  role: Joi.string().valid('admin', 'manager', 'employee').default('employee'),
  department: Joi.string().max(100).optional(),
});

const createProjectSchema = Joi.object({
  projectCode: Joi.string().max(20).optional().allow(''),
  name: Joi.string().min(1).max(255).required(),
  description: Joi.string().optional().allow(''),
  color: Joi.string().max(10).default('#6366f1'),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  status: Joi.string().valid('active', 'completed', 'on-hold').default('active'),
  reportingManagers: Joi.array().items(Joi.string().uuid()).default([]),
});

const createAssignmentSchema = Joi.object({
  userId: Joi.string().uuid().required(),
  projectId: Joi.string().uuid().required(),
  rmId: Joi.string().uuid().required(),
  role: Joi.string().valid('IC', 'MS', 'TPM', 'PM', 'QA', 'BA').required(),
});

const createMilestoneSchema = Joi.object({
  projectId: Joi.string().uuid().required(),
  name: Joi.string().min(1).max(255).required(),
  description: Joi.string().optional().allow(''),
  role: Joi.string().valid('IC', 'MS', 'TPM', 'PM', 'QA', 'BA').optional().allow('', null),
});

module.exports = {
  createDesignationSchema,
  createEmployeeSchema,
  createProjectSchema,
  createAssignmentSchema,
  createMilestoneSchema,
};
