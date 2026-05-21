const express = require('express');
const router = express.Router();
const multer = require('multer');
const userController = require('../controllers/userController');
const { authenticate } = require('../middlewares/auth');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.use(authenticate);

router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);
router.post('/avatar', upload.single('avatar'), userController.uploadAvatar);
router.put('/change-password', userController.changePassword);
router.get('/report', userController.getMyReport);
router.get('/team', userController.getMyTeam);

module.exports = router;
