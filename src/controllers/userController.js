const catchAsync = require('../utils/catchAsync');
const userService = require('../services/userService');

exports.getProfile = catchAsync(async (req, res) => {
  const data = await userService.getProfile(req.user.id);
  res.json({ status: 'success', data });
});

exports.updateProfile = catchAsync(async (req, res) => {
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
