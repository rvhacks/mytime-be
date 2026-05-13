const Joi = require('joi');
const { PROJECT_ROLE_KEYS } = require('../constants');

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
  department: Joi.string().max(100).optional().allow('', null),
  reportingManagerId: Joi.string().uuid().optional().allow('', null),
});

const createProjectSchema = Joi.object({
  projectCode: Joi.string().max(20).optional().allow('', null),
  name: Joi.string().min(1).max(255).required(),
  description: Joi.string().optional().allow('', null),
  color: Joi.string().max(10).optional().allow('', null),
  startDate: Joi.date().optional().allow(null),
  endDate: Joi.date().optional().allow(null),
  status: Joi.string().valid('active', 'completed', 'on-hold').default('active'),
});

const createAssignmentSchema = Joi.object({
  userId: Joi.string().uuid().required(),
  projectId: Joi.string().uuid().required(),
  role: Joi.string().valid(...PROJECT_ROLE_KEYS).required(),
});

const createMilestoneSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  description: Joi.string().optional().allow('', null),
  role: Joi.string().valid(...PROJECT_ROLE_KEYS).required(),
});

module.exports = {
  createDesignationSchema,
  createEmployeeSchema,
  createProjectSchema,
  createAssignmentSchema,
  createMilestoneSchema,
};
