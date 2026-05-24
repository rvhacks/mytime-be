const catchAsync = require('../utils/catchAsync');
const userService = require('../services/userService');

exports.getProfile = catchAsync(async (req, res) => {
  const data = await userService.getProfile(req.user.id);
  res.json({ status: 'success', data });
});

exports.updateProfile = catchAsync(async (req, res) => {
  // Only admin can edit personal info (firstName, lastName, mobile, dob, designation)
  if (req.user.role !== 'admin') {
    return res.status(403).json({ status: 'fail', message: 'Only admin can edit profile personal information' });
  }
  const data = await userService.updateProfile(req.user.id, req.body);
  res.json({ status: 'success', data });
});

exports.uploadAvatar = catchAsync(async (req, res) => {
  if (!req.file) return res.status(400).json({ status: 'fail', message: 'No file uploaded' });
  const data = await userService.uploadAvatar(req.user.id, req.file);
  res.json({ status: 'success', data });
});

exports.changePassword = catchAsync(async (req, res) => {
  const data = await userService.changePassword(req.user.id, req.body.currentPassword, req.body.newPassword);
  res.json({ status: 'success', data });
});

exports.getMyReport = catchAsync(async (req, res) => {
  const { startDate, endDate, projectId, targetUserId } = req.query;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;

  // RM can view reports of their direct reports
  let userId = req.user.id;
  if (targetUserId && targetUserId !== req.user.id) {
    const { User } = require('../infrastructure/models');
    const target = await User.findByPk(targetUserId);
    if (!target || target.reporting_manager_id !== req.user.id) {
      return res.status(403).json({ status: 'fail', message: 'You can only view reports for your direct reports' });
    }
    userId = targetUserId;
  }

  const data = await userService.getMyReport({ userId, startDate, endDate, projectId, page, limit });
  res.json({ status: 'success', data });
});

exports.getMyTeam = catchAsync(async (req, res) => {
  const { projectId } = req.query;
  const data = await userService.getMyTeam(req.user.id, projectId);
  res.json({ status: 'success', data });
});
