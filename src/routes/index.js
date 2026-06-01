const express = require('express');
const router = express.Router();

const authRoutes = require('./auth');
const userRoutes = require('./user');
const adminRoutes = require('./admin');
const timesheetRoutes = require('./timesheet');
const notificationRoutes = require('./notification');
const roleRoutes = require('./roles');

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/admin', adminRoutes);
router.use('/timesheets', timesheetRoutes);
router.use('/notifications', notificationRoutes);
router.use('/roles', roleRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

module.exports = router;
