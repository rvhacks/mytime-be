const { verifyToken } = require('../utils/jwt');
const AppError = require('../utils/AppError');
const { User } = require('../infrastructure/models');

/**
 * Authenticate JWT from Authorization header.
 * Also injects `req.user.isManager` dynamically based on reporting hierarchy.
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Authentication required', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password'] },
    });

    if (!user || user.status !== 'active') {
      throw new AppError('User not found or inactive', 401);
    }

    // Dynamic manager check: does anyone report to this user?
    const directReportCount = await User.count({
      where: { reporting_manager_id: user.id, status: 'active' },
    });

    req.user = user;
    req.user.isManager = directReportCount > 0;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return next(new AppError('Invalid or expired token', 401));
    }
    next(error);
  }
};

/**
 * Authorize by role(s).
 * Supports 'manager' as a dynamic pseudo-role (checks isManager flag).
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    // Check static role match OR dynamic manager
    const hasRole = roles.some((role) => {
      if (role === 'manager') return req.user.isManager;
      return req.user.role === role;
    });

    if (!hasRole) {
      return next(new AppError('Insufficient permissions', 403));
    }
    next();
  };
};

module.exports = { authenticate, authorize };
