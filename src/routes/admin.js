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

// ---- Accessible by ALL authenticated roles ----
router.get('/dashboard/stats', adminController.getDashboardStats);
router.get('/dashboard/activity', adminController.getRecentActivity);
router.get('/role-constants', adminController.getRoleConstants);

// ---- Admin-only routes below ----
router.use(authorize('admin'));

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
router.put('/employees/:id/deactivate', adminController.deactivateEmployee);
router.put('/employees/:id/activate', adminController.activateEmployee);
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

// Admin Approvals: Manager Dashboard
router.get('/approvals/managers', adminController.getManagersWithPendingApprovals);
router.get('/approvals/manager/:managerId/entries', adminController.getManagerDirectReportEntries);
router.post('/approvals/remind', adminController.sendBulkReminders);
// Reports
router.get('/reports/timesheet-summary/export', adminController.exportTimesheetReport);
router.get('/reports/timesheet-summary', adminController.getTimesheetReport);

module.exports = router;
