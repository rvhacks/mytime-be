const express = require('express');
const router = express.Router();
const tc = require('../controllers/timesheetController');
const { authenticate, authorize } = require('../middlewares/auth');

router.use(authenticate);

// ---- Employee timesheet ----
router.get('/my', tc.getMyTimesheets);
router.get('/week', tc.getMyTimesheet);
router.get('/assigned-projects', tc.getMyAssignedProjects);
router.post('/save', tc.saveEntries);             // save draft rows
router.post('/submit', tc.submitEntries);           // submit specific entry IDs
router.post('/recall', tc.recallEntries);           // recall specific entry IDs
router.get('/detail/:id', tc.getTimesheetDetail);

// Milestones by role
router.get('/milestones/role/:role', tc.getMilestonesByRole);

// Project detail (for employee My Projects)
router.get('/project/:projectId', tc.getProjectDetail);

// ---- Manager approvals (dynamic isManager check) ----
router.get('/approvals', authorize('manager', 'admin'), tc.getPendingApprovals);
router.post('/approvals/action', authorize('manager', 'admin'), tc.approvalAction);

// ---- Admin: view employee timesheets ----
router.get('/employee/:employeeId', authorize('admin'), tc.getEmployeeTimesheets);

// ---- Reports ----
router.get('/reports', tc.getReports);

module.exports = router;
