import express from 'express';
import * as authController from '../controllers/authController.js';
import { validateRegister, validateLogin } from '../validators/authValidator.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/register', validateRegister, authController.register);
router.post('/login', validateLogin, authController.login);
router.get('/me', authenticate, authController.getMe);
router.post('/change-password', authenticate, authController.changePassword);
router.post('/logout', authController.logout);

export default router;

