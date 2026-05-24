const AppError = require('../utils/AppError');

/**
 * Joi validation middleware factory
 */
const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const messages = error.details.map((d) => d.message);
      return next(new AppError(messages.join('; '), 400));
    }

    next();
  };
};

/**
 * Joi query validation middleware
 */
const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const messages = error.details.map((d) => d.message);
      return next(new AppError(messages.join('; '), 400));
    }

    next();
  };
};

module.exports = { validate, validateQuery };
