const catchAsync = require('../utils/catchAsync');
const authService = require('../services/authService');

exports.login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.login(email, password);
  res.json({ status: 'success', data: result });
});

exports.forgotPassword = catchAsync(async (req, res) => {
  const result = await authService.forgotPassword(req.body.email);
  res.json({ status: 'success', data: result });
});

exports.verifyOtp = catchAsync(async (req, res) => {
  const result = await authService.verifyOtp(req.body.email, req.body.otp);
  res.json({ status: 'success', data: result });
});

exports.resetPassword = catchAsync(async (req, res) => {
  const result = await authService.resetPassword(req.body.email, req.body.otp, req.body.newPassword);
  res.json({ status: 'success', data: result });
});

exports.me = catchAsync(async (req, res) => {
  res.json({ status: 'success', data: { user: req.user } });
});
