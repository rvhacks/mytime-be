const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, authorize } = require('../middlewares/auth');
const { validate } = require('../middlewares/validate');
const {
  createDesignationSchema, createEmployeeSchema, createProjectSchema,
  createAssignmentSchema, createMilestoneSchema,
} = require('../validators/admin');

router.use(authenticate);
router.use(authorize('admin'));

// Dashboard stats
router.get('/dashboard/stats', adminController.getDashboardStats);

// Designations
router.get('/designations', adminController.getDesignations);
router.post('/designations', validate(createDesignationSchema), adminController.createDesignation);
router.put('/designations/:id', validate(createDesignationSchema), adminController.updateDesignation);
router.delete('/designations/:id', adminController.deleteDesignation);

// Employees
router.get('/employees', adminController.getEmployees);
router.post('/employees', validate(createEmployeeSchema), adminController.createEmployee);
router.put('/employees/:id', adminController.updateEmployee);
router.post('/employees/:id/reset-password', adminController.resetEmployeePassword);
router.delete('/employees/:id', adminController.deleteEmployee);

// Projects
router.get('/projects', adminController.getProjects);
router.post('/projects', validate(createProjectSchema), adminController.createProject);
router.put('/projects/:id', adminController.updateProject);
router.delete('/projects/:id', adminController.deleteProject);

// Assignments
router.get('/assignments', adminController.getAssignments);
router.post('/assignments', validate(createAssignmentSchema), adminController.createAssignment);
router.delete('/assignments/:id', adminController.deleteAssignment);

// Milestones
router.get('/milestones', adminController.getMilestones);
router.get('/milestones/role/:role', adminController.getMilestonesByRole);
router.post('/milestones', validate(createMilestoneSchema), adminController.createMilestone);
router.put('/milestones/:id', adminController.updateMilestone);
router.delete('/milestones/:id', adminController.deleteMilestone);

module.exports = router;
