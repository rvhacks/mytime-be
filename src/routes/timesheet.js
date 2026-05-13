const express = require('express');
const router = express.Router();
const timesheetController = require('../controllers/timesheetController');
const { authenticate, authorize } = require('../middlewares/auth');
const { validate } = require('../middlewares/validate');
const { saveTimesheetSchema, submitTimesheetSchema, approvalActionSchema } = require('../validators/timesheet');

router.use(authenticate);

// Employee timesheet
router.get('/my', timesheetController.getMyTimesheets);
router.get('/week', timesheetController.getMyTimesheet);
router.get('/assigned-projects', timesheetController.getMyAssignedProjects);
router.post('/save', validate(saveTimesheetSchema), timesheetController.saveTimesheet);
router.post('/submit', validate(submitTimesheetSchema), timesheetController.submitTimesheet);
router.post('/recall/:id', timesheetController.recallTimesheet);
router.get('/detail/:id', timesheetController.getTimesheetDetail);

// Milestones by role (for timesheet dropdown filtering)
router.get('/milestones/role/:role', timesheetController.getMilestonesByRole);

// Manager approvals
router.get('/approvals', authorize('manager', 'admin'), timesheetController.getPendingApprovals);
router.post('/approvals/action', authorize('manager', 'admin'), validate(approvalActionSchema), timesheetController.approvalAction);

// Admin: view employee timesheets
router.get('/employee/:employeeId', authorize('admin'), timesheetController.getEmployeeTimesheets);

// Reports
router.get('/reports', timesheetController.getReports);

module.exports = router;
