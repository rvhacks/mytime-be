const express = require('express');
const router = express.Router();

/**
 * GET /api/roles — list all project roles (master data)
 * Public endpoint — no admin restriction needed since roles
 * are used in assignment and milestone forms by all users.
 */
router.get('/', async (req, res, next) => {
  try {
    const { Role } = require('../infrastructure/models');
    const roles = await Role.findAll({
      attributes: ['id', 'key', 'label'],
      order: [['label', 'ASC']],
    });
    res.json({ status: 'success', data: roles });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
