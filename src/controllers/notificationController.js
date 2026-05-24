const catchAsync = require('../utils/catchAsync');
const notificationService = require('../services/notificationService');
const { buildPaginationQuery, buildPaginationResponse } = require('../utils/helpers');

exports.getNotifications = catchAsync(async (req, res) => {
  const { page, limit, offset } = buildPaginationQuery(req.query);
  const unreadOnly = req.query.unreadOnly === 'true';
  const data = await notificationService.getUserNotifications(req.user.id, { limit, offset, unreadOnly });
  res.json({ status: 'success', data: buildPaginationResponse(data, page, limit) });
});

exports.getUnreadCount = catchAsync(async (req, res) => {
  const count = await notificationService.getUnreadCount(req.user.id);
  res.json({ status: 'success', data: { count } });
});

exports.markAsRead = catchAsync(async (req, res) => {
  await notificationService.markAsRead(req.params.id, req.user.id);
  res.json({ status: 'success', message: 'Notification marked as read' });
});

exports.markAllAsRead = catchAsync(async (req, res) => {
  await notificationService.markAllAsRead(req.user.id);
  res.json({ status: 'success', message: 'All notifications marked as read' });
});
